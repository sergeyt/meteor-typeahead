Nba = new Meteor.Collection("nba");
Nhl = new Meteor.Collection("nhl");
Repos = new Meteor.Collection("repos");

if (Meteor.isServer) {

	Meteor.startup(function() {

		function fill(col, source, map){
			col.remove({});
			JSON.parse(Assets.getText(source)).forEach(function(it){
				col.insert(typeof map === 'function' ? map(it) : it);
			});
		}

		fill(Nba, 'nba.json', function(name){ return {name: name}; });
		fill(Nhl, 'nhl.json', function(name){ return {name: name}; });
		fill(Repos, 'repos.json');
	});

	Meteor.methods({
		emails: function(){
			return [
					'stodyshev@gmail.com'
			];
		}
	});
}

if (Meteor.isClient) {

	var handles = [];
	['nba', 'nhl', 'repos'].forEach(function(name){
		var handle = Meteor.subscribe(name, function() {
		});
		handles.push(handle);
	});

	function init() {
		Meteor.typeahead(this.find('.typeahead'));
	};

	var nba = function(){
		return Nba.find().fetch().map(function(it){ return it.name; });
	};
	var nhl = function(){
		return Nhl.find().fetch().map(function(it){ return it.name; });
	};

	Template.example1.nba = function(){
		return JSON.stringify(nba());
	};
	Template.example1.rendered = init;

	Template.example2.teams = function(){
		return JSON.stringify([
			{
				name: 'nba-teams',
				local: nba(),
				header: '<h3 class="league-name">NBA Teams</h3>'
			},
			{
				name: 'nhl-teams',
				local: nhl(),
				header: '<h3 class="league-name">NHL Teams</h3>'
			}
		]);
	};
	Template.example2.rendered = init;

	Template.example3.repos = function(){
		return JSON.stringify(Repos.find().fetch());
	};
	Template.example3.rendered = init;

	var emails = function(query, callback){
		Meteor.call('emails', function(err, res){
			callback(res.map(function(v){ return {value: v}; }));
		});
	};

	Template.example4.rendered = function(){
		Meteor.typeahead(this.find('.typeahead'), emails);
	};

	var feed = function(query, callback){
		// TODO do remote query here
		var set = ['!', '!!', '!!!'].map(function(a){ return {value: query + a}; });
		callback(set);
    };

	Template.example5.rendered = function(){
		Meteor.typeahead(this.find('.typeahead'), feed);
	};
}
