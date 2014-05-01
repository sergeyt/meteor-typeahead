Nba = new Meteor.Collection("nba");
Nhl = new Meteor.Collection("nhl");
Repos = new Meteor.Collection("repos");
BigCollection = new Meteor.Collection('bigcollection');

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

		// thanks to https://github.com/mizzao/meteor-autocomplete/blob/master/examples/pubsublocal/server/server.js
		if (!BigCollection.find().count()) {
			// Create a "large" collection with a series of records that area easy to
			// predict by a human, but not continuous, so that only some searches will
			// match. For example, all 4-letter words that can be typed with the 20
			// letters from 'a' to 't'. Furthermore, stuff them in the database in a
			// non-alphabetical order, to test how sorting works.
			var someLetters = 'tsrqponmlkjihgfedcba'.split('');
			for (var i1 = 0; i1 < someLetters.length; i1++) {
				for (var i2 = 0; i2 < someLetters.length; i2++) {
					for (var i3 = 0; i3 < someLetters.length; i3++) {
						for (var i4 = 0; i4 < someLetters.length; i4++) {
							BigCollection.insert({
								_id: i1.toString() + '-' + i2.toString() + '-' + i3.toString() + '-' + i4.toString(),
								name: someLetters[i1]+someLetters[i2]+someLetters[i3]+someLetters[i4]
							});
						}
					}
				}
			}
		}

		// Create an index on the name field of BigCollection
		BigCollection._ensureIndex({name: 1});
	});

	Meteor.methods({
		emails: function() {
			return [
				'stodyshev@gmail.com'
			];
		},
		search: function(query, options) {
			if (!query) return [];

			options = options || {};

			// guard against client-side DOS: hard limit to 50
			if (options.limit) {
				options.limit = Math.min(50, Math.abs(options.limit));
			} else {
				options.limit = 50;
			}

			// TODO fix regexp to support multiple tokens
			var regex = new RegExp("^" + query);
			return BigCollection.find({name: {$regex:  regex}}, options).fetch();
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

	// simple example
	Template.example1.nba = function(){
		return nba();
	};

	// example for multiple datasets
	Template.example2.teams = function(){
		return [
			{
				name: 'nba-teams',
				valueKey: 'name',
				local: function() {
					return Nba.find().fetch();
				},
				header: '<h3 class="league-name">NBA Teams</h3>',
				template: 'team'
			},
			{
				name: 'nhl-teams',
				valueKey: 'name',
				local: function(){
					return Nhl.find().fetch();
				},
				header: '<h3 class="league-name">NHL Teams</h3>',
				template: 'team'
			},
//			{
//				name: 'other',
//				header: '<h3 class="league-name">Other</h3>',
//				local: function(query, callback) {
//					Meteor.call('search', query, {}, function(err, res) {
//						if (err) {
//							console.log(err);
//							return;
//						}
//						callback(res.map(function(v){ return {value: v.name}; }));
//					});
//				}
//			}
		];
	};

	// example for custom template
	Template.example3.repos = function(){
		return Repos.find().fetch();
	};

	// example for async data-source
	Template.example4.emails = function(query, callback) {
		Meteor.call('emails', function(err, res) {
			if (err) {
				console.log(err);
				return;
			}
			callback(res.map(function(v){ return {value: v}; }));
		});
	};

	Template.example5.feed = function(query, callback){
		// TODO do remote query here
		var set = ['!', '!!', '!!!'].map(function(a){ return {value: query + a}; });
		callback(set);
    };

	// example for server side search
	Template.example6.search = function(query, callback) {
		Meteor.call('search', query, {}, function(err, res) {
			if (err) {
				console.log(err);
				return;
			}
			callback(res.map(function(v){ return {value: v.name}; }));
		});
	};

	Meteor.startup(function(){
		// initializes all typeahead instances
		Meteor.typeahead.inject();
	});
}
