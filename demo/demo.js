Nba = new Meteor.Collection("nba");

if (Meteor.isServer) {

	Meteor.publish('nba', function() {
		return Nba.find();
	});

	Meteor.startup(function() {
		if (Nba.find().count() === 0) {
			[
				"Boston Celtics",
				"Dallas Mavericks",
				"Brooklyn Nets",
				"Houston Rockets",
				"New York Knicks",
				"Memphis Grizzlies",
				"Philadelphia 76ers",
				"New Orleans Hornets",
				"Toronto Raptors",
				"San Antonio Spurs",
				"Chicago Bulls",
				"Denver Nuggets",
				"Cleveland Cavaliers",
				"Minnesota Timberwolves",
				"Detroit Pistons",
				"Portland Trail Blazers",
				"Indiana Pacers",
				"Oklahoma City Thunder",
				"Milwaukee Bucks",
				"Utah Jazz",
				"Atlanta Hawks",
				"Golden State Warriors",
				"Charlotte Bobcats",
				"Los Angeles Clippers",
				"Miami Heat",
				"Los Angeles Lakers",
				"Orlando Magic",
				"Phoenix Suns",
				"Washington Wizards",
				"Sacramento Kings"
			].forEach(function(name){
				Nba.insert({name: name});
				console.log('inserted %s', name);
			});
		}
	});
}

if (Meteor.isClient) {

	var nbaHandle = Meteor.subscribe('nba', function() {
	});

	Template.app['nba-teams'] = function(){
		return JSON.stringify(Nba.find().fetch().map(function(it){
			return it.name;
		}));
	};

	Template.app.rendered = function() {
		$(this.firstNode).find('.typeahead').each(function(){
			Meteor.typeahead(this);
		});
	};
}