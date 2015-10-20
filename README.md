# meteor-typeahead [![Build Status](https://drone.io/github.com/sergeyt/meteor-typeahead/status.png)](https://drone.io/github.com/sergeyt/meteor-typeahead/latest) [![LICENSE](http://img.shields.io/badge/LICENSE-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT) [![meteor package version](http://img.shields.io/badge/atmosphere-0.11.1_6-brightgreen.svg)](https://atmospherejs.com/sergeyt/typeahead)

[![Deps Status](https://david-dm.org/sergeyt/meteor-typeahead.png)](https://david-dm.org/sergeyt/meteor-typeahead)
[![DevDeps Status](https://david-dm.org/sergeyt/meteor-typeahead/dev-status.png)](https://david-dm.org/sergeyt/meteor-typeahead#info=devDependencies)

[th]: http://twitter.github.io/typeahead.js

Twitter's [typeahead.js](http://twitter.github.io/typeahead.js/examples/) autocomplete package, wrapped for Meteor 1.0+. Issue command `meteor add sergeyt:typeahead` to install the package.

* [Live demo](http://typeahead.meteor.com/)
* [Documentation](https://github.com/sergeyt/meteor-typeahead/blob/master/docs.md)

## Examples

See [demo](https://github.com/sergeyt/meteor-typeahead/tree/master/demo) application in this repository to find more examples.

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

Template.demo.helpers({
  nba: function() {
    return Nba.find().fetch().map(function(it){ return it.name; });
  }
});
```

### Multiple datasets

```html
<template name="demo">
  <div class="form-group">
    <input class="form-control typeahead" name="team" type="text"
           placeholder="NBA and NHL teams"
           autocomplete="off" spellcheck="off"
           data-sets="teams"/>
  </div>
</template>

<template name="team">
	<h4><i>{{name}}</i></h4>
</template>
```

```javascript
Template.demo.helpers({
  teams: function() {
    return [
      {
        name: 'nba-teams',
        valueKey: 'name',
        local: function() { return Nba.find().fetch(); },
        header: '<h3 class="league-name">NBA Teams</h3>',
        template: 'team'
      },
      {
        name: 'nhl-teams',
        valueKey: 'name',
        local: function() { return Nhl.find().fetch(); },
        header: '<h3 class="league-name">NHL Teams</h3>',
        template: 'team'
      }
    ];
  }
});
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
  Template.demo.helpers({
    repos: function() {
      // this only works if returned objects have
      // an attribute named "value" containing the text
      // See docs for "data-value-key" attribute
      return Repos.find().fetch();
    }
  });
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

  Template.demo.helpers({
    search = function(query, sync, callback) {
      Meteor.call('search', query, {}, function(err, res) {
        if (err) {
          console.log(err);
          return;
        }
        callback(res.map(function(v){ return {value: v.name}; }));
      });
    }
  });
}
```

### Catching selected event with id

```js
Template.example.rendered = function() {
  Meteor.typeahead.inject();
}

Template.example.helpers({
  items: function() {
    // data source function
    // TODO fetch items from meteor collection
    return someCollections.find().fetch().map(function(object){ return {id: object._id, value: object.value}; });
  },
  selected: function(event, suggestion, datasetName) {
    // event - the jQuery event object
    // suggestion - the suggestion object
    // datasetName - the name of the dataset the suggestion belongs to
    // TODO your event handler here
    console.log(suggestion.id);
  }
});
```

Template:
```html
<template name="example">
  <input placeholder="Kies een plaats" autocomplete="off" spellcheck="off"
      data-source="items" data-select="selected"/>
</template>
```

### Initializing the typeahead
When the DOM is loaded through Meteor.startup on each template
```javascript
Meteor.startup(function() {
  Meteor.typeahead.inject();
});
```

#### with iron:router
Using iron:router the Meteor.startup is already triggered because it loads the template or the loading template and then inject the data. It must be delayed to when iron:router knows it is rendered completely.

```javascript
Template.demo.rendered = function() {
  Meteor.typeahead.inject();
};
```

### Styling

By default, there is no style applied with this package.
If you want the same styling as in the demo app, please do the following:
- add bootstrap: `meteor add twbs:bootstrap`
- add the [style.css](https://github.com/sergeyt/meteor-typeahead/blob/master/demo/style.css) file to your application
