Nba = new Meteor.Collection("nba");
Nhl = new Meteor.Collection("nhl");
Repos = new Meteor.Collection("repos");

if (Meteor.isServer) {

	Meteor.startup(function() {

		function fill(col, source, map){
			if (col.find().count() === 0) {
				JSON.parse(Assets.getText(source)).forEach(function(it){
					col.insert(typeof map === 'function' ? map(it) : it);
				});
			}
		}

		fill(Nba, 'nba.json', function(name){ return {name: name}; });
		fill(Nhl, 'nhl.json', function(name){ return {name: name}; });
		fill(Repos, 'repos.json');
	});
}

if (Meteor.isClient) {

	var handles = [];
	['nba', 'nhl', 'repos'].forEach(function(name){
		var handle = Meteor.subscribe(name, function() {
		});
		handles.push(handle);
	});

	Template.demo.nba = function(){
		return JSON.stringify(Nba.find().fetch().map(function(it){
			return it.name;
		}));
	};

	Template.demo.nhl = function(){
		return JSON.stringify(Nhl.find().fetch().map(function(it){
			return it.name;
		}));
	};

	Template.demo.teams = function(){
		return JSON.stringify([
			{
				name: 'nba-teams',
				local: Nba.find().fetch().map(function(it){ return it.name; }),
				header: '<h3 class="league-name">NBA Teams</h3>'
			},
			{
				name: 'nhl-teams',
				local: Nhl.find().fetch().map(function(it){ return it.name; }),
				header: '<h3 class="league-name">NHL Teams</h3>'
			}
		]);
	};

	Template.demo.repos = function(){
		return JSON.stringify(Repos.find().fetch());
	};

	Template.demo.rendered = function() {
		$(this.firstNode).find('.typeahead').each(function(){
			Meteor.typeahead(this);
		});
	};
}