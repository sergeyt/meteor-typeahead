[![LICENSE](http://img.shields.io/badge/LICENSE-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

[![Build Status](https://drone.io/github.com/sergeyt/meteor-typeahead/status.png)](https://drone.io/github.com/sergeyt/meteor-typeahead/latest)
[![Deps Status](https://david-dm.org/sergeyt/meteor-typeahead.png)](https://david-dm.org/sergeyt/meteor-typeahead)
[![DevDeps Status](https://david-dm.org/sergeyt/meteor-typeahead/dev-status.png)](https://david-dm.org/sergeyt/meteor-typeahead#info=devDependencies)

[![NPM version](https://badge.fury.io/js/meteor-typeahead.png)](http://badge.fury.io/js/meteor-typeahead)
[![meteor package version](http://img.shields.io/badge/atmosphere-0.0.8-brightgreen.svg)](https://atmospherejs.com/package/typeahead)

[![NPM](https://nodei.co/npm/meteor-typeahead.png?downloads=true&stars=true)](https://nodei.co/npm/meteor-typeahead/)

# meteor-typeahead

Twitter's [typeahead.js](http://twitter.github.io/typeahead.js/examples/) autocomplete package, wrapped for Meteor

## API

```javascript
/**
 * Activates typeahead behavior for given input DOM element.
 * @param element (required) The DOM element to infect.
 * @param source (optional) The custom data source.
 */
Meteor.typeahead(element, source);

/**
 * Activates all typeahead elements.
 * @param selector (optional) CSS selector to find typeahead elements to be activated.
 */
Meteor.typeahead.inject(selector);
```

## Examples

### data-source attribute

```html
<input class="form-control typeahead" name="team" type="text"
       placeholder="NBA teams"
       autocomplete="off" spellcheck="off"
       data-source="nba"/>
```

```javascript
Nba = new Meteor.Collection("nba");

if (Meteor.isServer){
	Nba.insert({name:'Boston Celtics'});
	// fill Nba collection
}

Template.demo.nba = function(){
	return Nba.find().fetch().map(function(it){ return it.name; });
};
```

### Multiple datasets

```html
<input class="form-control typeahead" name="team" type="text"
       placeholder="NBA and NHL teams"
       autocomplete="off" spellcheck="off"
       data-sets="teams"/>
```

```javascript
Template.demo.teams = function(){
	return [
		{
			name: 'nba-teams',
			local: function() { return Nba.find().fetch().map(function(it){ return it.name; }); },
			header: '<h3 class="league-name">NBA Teams</h3>'
		},
		{
			name: 'nhl-teams',
			local: function() { return Nhl.find().fetch().map(function(it){ return it.name; }); },
			header: '<h3 class="league-name">NHL Teams</h3>'
		}
	];
};
```

### Custom template to render suggestion

```html
<input class="form-control typeahead" name="repo" type="text"
       placeholder="open source projects by Twitter"
       autocomplete="off" spellcheck="off"
       data-source="repos" data-template="repo"/>

<template name="repo">
       <p class="repo-language">{{language}}</p>
       <p class="repo-name">{{name}}</p>
       <p class="repo-description">{{description}}</p>
</template>
```

```javascript
Repos = new Meteor.Collection("repos");

if (Meteor.isServer){
	Meteor.startup(function(){
		Repos.remove({});
		// fill repos from private repos.json asset
		JSON.parse(Assets.getText('repos.json')).forEach(function(it){
			Repos.insert(it);
		});
	});
}

if (Meteor.isClient){
	Template.demo.repos = function(){
		return Repos.find().fetch();
	};
}
```

### Server side search

```html
<input class="form-control typeahead" name="search" type="text" placeholder="Type to query"
       autocomplete="off" spellcheck="off"
       data-source="search"/>
```

```javascript
BigCollection = new Meteor.Collection('bigcollection');

if (Meteor.isServer) {
	Meteor.startup(function() {
		if (!BigCollection.find().count()) {
			// fill BigCollection
		}
	});

	Meteor.methods({
		search: function(query, options) {
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
} else {

	Template.demo.search = function(query, callback) {
		Meteor.call('search', query, {}, function(err, res) {
			if (err) {
				console.log(err);
				return;
			}
			callback(res.map(function(v){ return {value: v.name}; }));
		});
	};
}
```
