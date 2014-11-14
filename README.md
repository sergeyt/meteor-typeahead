[![Build Status](https://drone.io/github.com/sergeyt/meteor-typeahead/status.png)](https://drone.io/github.com/sergeyt/meteor-typeahead/latest)
[![Deps Status](https://david-dm.org/sergeyt/meteor-typeahead.png)](https://david-dm.org/sergeyt/meteor-typeahead)
[![DevDeps Status](https://david-dm.org/sergeyt/meteor-typeahead/dev-status.png)](https://david-dm.org/sergeyt/meteor-typeahead#info=devDependencies)

[![LICENSE](http://img.shields.io/badge/LICENSE-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)
[![NPM version](https://badge.fury.io/js/meteor-typeahead.png)](http://badge.fury.io/js/meteor-typeahead)
[![meteor package version](http://img.shields.io/badge/atmosphere-0.10.5_7-brightgreen.svg)](https://atmospherejs.com/sergeyt/typeahead)

# meteor-typeahead

[th]: http://twitter.github.io/typeahead.js

Twitter's [typeahead.js](http://twitter.github.io/typeahead.js/examples/) autocomplete package, wrapped for Meteor 1.0+.

Demo: http://typeahead.meteor.com/


# Features

* Support fetching meteor collections as typeahead dataset
* Easy to bind auto-complete suggestions to input using `data-source` attribute
* Allow using meteor template to visualize auto-complete suggestion
* Support most [typeahead.js][th] use cases:
  * Asynchronous data sources
  * Prefetched JSON data source
  * Multiple datasets
* See [demo](http://typeahead.meteor.com/) application to find more functions
 

## Install
```javascript
meteor add sergeyt:typeahead
```

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

### Handling Objects Instead of primitives

Strings and other simple types are handled easily by Meteor-typeahead
 but objects are a little more complicated.  By default it looks for
 a property named "value" (and if it doesn't exist you'll encounter
 problems).  You can override both the field that typeahead searches
 for matches and the field it puts into the input field upon selection
 with a couple of data attributes:

```html
<input class="form-control typeahead" name="repo" type="text"
       placeholder="open source projects by Twitter"
       autocomplete="off" spellcheck="off"
       data-source="repos" data-value-key="description"
       data-display-key="name"/>
```

```javascript
Template.myTemplate.helpers({
  repos: function() {
    return [
      {
        "name": "typeahead.js",
        "description": "A fast and fully-featured autocomplete library",
        "language": "JavaScript",
        "value": "typeahead.js"
      },
      {
        "name": "cassandra",
        "description": "A Ruby client for the Cassandra distributed database",
        "language": "Ruby",
        "value": "cassandra"
      }
    ];
  }
})
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
