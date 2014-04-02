/**
 * Activates typeahead behavior for given element.
 * @param element The DOM element to modify.
 * @param source The custom data source.
 */
Meteor.typeahead = function(element, source, template) {
	var $e = $(element);
	var datasets = resolve_datasets($e, source, template);

	$e.typeahead('destroy');

	if (Array.isArray(datasets)) {
		$e.typeahead.apply($e, [null].concat(datasets));
	} else {
		$e.typeahead(null, datasets);
	}

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')) {
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}
};

/**
 * Activates all typeahead elements.
 * @param selector (optional) selector for typeahead elements
 */
Meteor.typeahead.inject = function(selector){
	if (!selector) {
		selector = '.typeahead';
	}

	Object.keys(Template).forEach(function(key){
		wrap_rendered_callback(Template[key], selector);
	});
};

function wrap_rendered_callback(template, selector) {
	var renderedCallback = template.rendered;
	template.rendered = function() {
		var self = this;
		var e = $(self.find(selector));
		if (e.length) {
			Meteor.typeahead(e[0], null, self);
		} else {
			template.rendered = renderedCallback;
		}
		if (renderedCallback) {
			renderedCallback.call(self);
		}
	};
}

function resolve_datasets($e, source, template) {
	var datasets = $e.data('sets');
	if (datasets) {
		if (typeof datasets == 'string') {
			datasets = resolve_source(template, datasets);
		}
		return datasets.map(function(ds) {
			return wrap(ds);
		});
	}

	var name = $e.attr('name') || $e.attr('id') || 'dataset';
	var limit = $e.data('limit');
	var templateName = $e.data('template'); // specifies name of custom template
	var displayKey = $e.data('display-key');

	if (!source) {
		source = $e.data('source') || [];
	}

	if (typeof source === 'string') {
		source = resolve_source(template, source);
	}

	var dataset = {
		name: name,
		displayKey: displayKey
	};

	if (limit) {
		dataset.limit = limit;
	}

	if (typeof source == 'function') {
		dataset.source = source;
	} else {
		dataset.local = source;
	}

	// support for custom templates
	setup_template(dataset, templateName);

	if (Array.isArray(dataset.local)) {
		return wrap(dataset);
	}

	return dataset;
}

function resolve_source(template, name) {
	if (!template || !template.__component__) {
		return [];
	}
	var fn = template.__component__[name];
	if (typeof fn != 'function') {
		console.log("Unable to resolve data source function '%s'.", name);
		return [];
	}
	if (fn.length === 0) {
		// TODO make reactive, e.g. return as reactive function
		return fn();
	}
	// TODO wrap function(query, callback) to check signature
	return fn;
}

function setup_template(dataset, template) {
	if (!template) return;
	var tmpl = Template[template];
	dataset.template = function(context) {
		var div = $("<div/>");
		var range = UI.renderWithData(tmpl, context);
		UI.insert(range, div[0]);
		return div.html();
	};
}

// creates Bloodhound suggestion engine based on given dataset
function wrap(dataset) {

	var key = dataset.displayKey;
	if (!key && !dataset.template) {
		dataset.local = dataset.local.map(function(value) {
			if (typeof value == 'object') {
				if (!key) {
					key = Object.keys(value)[0];
				}
				return value;
			}
			return {value: value};
		});
	}

	if (!key) {
		key = 'value';
	}

	var options = $.extend({}, dataset, {
		// TODO support custom tokenizers
		datumTokenizer: function(d) { return Bloodhound.tokenizers.whitespace(d.value); },
		queryTokenizer: Bloodhound.tokenizers.whitespace
	});

	var templates = {};

	if (dataset.header) {
		templates.header = dataset.header;
	}
	if (dataset.template) {
		templates.suggestion = dataset.template;
	}

	var engine = new Bloodhound(options);

	engine.initialize();

	return {
		displayKey: key,
		source: engine.ttAdapter(),
		templates: templates
	};
}
