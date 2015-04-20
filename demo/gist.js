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

			function evalGist(js){
				/* jshint -W061 */

				var src = "";
				var document = {
					write: function(html){
						src += html;
					}
				};

				try {
					eval(js);
				} catch (err) {
					console.log(err);
				}

				return src;
			}

			var key = 'gist-' + id;

			Meteor.call('gist', user, id, function(err,res){
				if (err){
					console.log(err);
					return;
				}
				if (!Session.get(key)){
					var content = evalGist(res.content);
					Session.set(key, content);
				}
			});

			return Session.get(key);
		}
	};

	Handlebars.registerHelper('gist', function(user, id){
		// TODO fix gist helper since now it causes 'socket hang up' error
		// return Meteor.Gist.get(user, id);
		return '';
	});
}
