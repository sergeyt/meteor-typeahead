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

	var nba = function(){
		return Nba.find().fetch().map(function(it){ return it.name; });
	};
	var nhl = function(){
		return Nhl.find().fetch().map(function(it){ return it.name; });
	};

	Template.example1.nba = function(){
		return nba();
	};

	Template.example2.teams = function(){
		return [
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
		];
	};

	Template.example3.repos = function(){
		return Repos.find().fetch();
	};

	Template.example4.emails = function(query, callback) {
		Meteor.call('emails', function(err, res){
			callback(res.map(function(v){ return {value: v}; }));
		});
	};

	Template.example5.feed = function(query, callback){
		// TODO do remote query here
		var set = ['!', '!!', '!!!'].map(function(a){ return {value: query + a}; });
		callback(set);
    };

	// initializes all typeahead instances
	Meteor.typeahead.inject();
}
