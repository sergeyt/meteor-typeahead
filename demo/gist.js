if (Meteor.isServer){
	Meteor.methods({
		gist: function(user, id){
			var base = "https://gist.github.com/";
			if (user) base += user + "/";
			return HTTP.get(base + id  + ".js");
		}
	});
}

if (Meteor.isClient){

	// reactive data source
	Meteor.Gist = {
		get: function(user, id){
			var key = 'gist-' + id;
			var val = Session.get(key);
			Meteor.call('gist', user, id, function(err,res){
				if (err){
					throw err;
				}
				if (val != res.content){
					Session.set(key, res.content);
				}
			});
			return val;
		}
	};

	function evalGist(js){
		var src = "";
		var document = {
			write: function(html){
				src += html;
			}
		};

		eval(js);

		return src;
	}

	Handlebars.registerHelper('gist', function(user, id){
		try {
			var js = Meteor.Gist.get(user, id);
			return js ? evalGist(js) : '';
		} catch (err) {
			console.log(err);
		}
		return '';
	});
}