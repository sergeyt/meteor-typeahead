/**
 * Activates typeahead behavior for given element.
 * @param element (required) The DOM element to infect.
 * @param source (optional) The custom data source.
 */
Meteor.typeahead = function(element, source) {
	var $e = $(element);
	var datasets = resolve_datasets($e, source);

	$e.typeahead('destroy');

	var opts = $e.data('options') || {};
	if (typeof opts != 'object') {
		opts = {};
	}

	// other known options passed via data attributes
	var highlight = Boolean($e.data('highlight')) || false;
	var hint = Boolean($e.data('hint')) || false;
	var minLength = parseInt($e.data('min-length')) || 1;

	var options = $.extend(opts, {
		highlight: highlight,
		hint: hint,
		minLength: minLength
	});

	if (Array.isArray(datasets)) {
		$e.typeahead.apply($e, [options].concat(datasets));
	} else {
		$e.typeahead(options, datasets);
	}

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')) {
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}
};

/**
 * Activates all typeahead elements.
 * @param selector (optional) selector to find typeahead elements to be activated
 */
Meteor.typeahead.inject = function(selector) {
	if (!selector) {
		selector = '.typeahead';
	}
	$(selector).each(function(i,e) {
		try {
			Meteor.typeahead(e);
		} catch (err) {
			console.log(err);
		}
	});
};

function resolve_datasets($e, source) {
	var element = $e[0];
	var datasets = $e.data('sets');
	if (datasets) {
		if (typeof datasets == 'string') {
			datasets = resolve_source(element, datasets);
		}
		if (typeof datasets == 'function') {
			datasets = datasets() || [];
		}
		return datasets.map(function(ds) {
			return make_bloodhound(ds);
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
		source = resolve_source(element, source);
	}

	var dataset = {
		name: name,
		displayKey: displayKey
	};

	if (limit) {
		dataset.limit = limit;
	}

	// support for custom templates
	if (templateName) {
		dataset.template = templateName;
	}

	if (Array.isArray(source) || (typeof source == 'function' && source.length === 0)) {
		dataset.local = source;
		return make_bloodhound(dataset);
	}

	dataset.source = source;
	dataset.templates = make_templates(dataset);

	return dataset;
}

function resolve_source(element, name) {
	var component = UI.DomRange.getContainingComponent(element);
	if (!component) {
		return [];
	}
	var fn = component[name];
	if (typeof fn != 'function') {
		console.log("Unable to resolve data source function '%s'.", name);
		return [];
	}
	return fn;
}

function make_template_function(templateName) {
	if (!templateName) {
		throw new Error("templateName is not specified");
	}

	var tmpl = Template[templateName];
	if (!tmpl) {
		throw new Error("Template '" + templateName  + "' is not defined");
	}

	return function(context) {
		var div = $("<div/>");
		var range = UI.renderWithData(tmpl, context);
		UI.insert(range, div[0]);
		return div.html();
	};
}

function make_templates(dataset) {
	var templates = {};
	if (dataset.header) {
		templates.header = dataset.header;
	}
	if (dataset.template) {
		var templateFn = typeof dataset.template == 'string' ?
			make_template_function(dataset.template)
			: dataset.template;
		if (typeof templateFn == 'function') {
			templates.suggestion = templateFn;
		}
	}
	return templates;
}

// creates Bloodhound suggestion engine based on given dataset
function make_bloodhound(dataset) {

	function wrap_value(value) {
		return {value: value};
	}

	if (!dataset.template) {
		if (Array.isArray(dataset.local)) {
			dataset.local = dataset.local.map(wrap_value);
		} else if (typeof dataset.local == 'function' && dataset.local.length === 0) {
			var localFn = dataset.local;
			dataset.local = function() {
				return (localFn() || []).map(wrap_value);
			};
		}
	}

	var need_bloodhound = Array.isArray(dataset.local) ||
		typeof dataset.local == 'function' && dataset.local.length === 0;

	var engine;
	var valueKey = dataset.valueKey || 'value';

	if (need_bloodhound) {
		var options = $.extend({}, dataset, {
			// TODO support custom tokenizers
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace(valueKey),
			queryTokenizer: Bloodhound.tokenizers.whitespace
		});

		engine = new Bloodhound(options);
		engine.initialize();

		if (typeof dataset.local == 'function' && dataset.local.length === 0) {
			// update data source on changing deps of local function
			// TODO find better (functional) way to do that
			Deps.autorun(function() {
				engine = new Bloodhound(options);
				engine.initialize();
			});
		}
	}

	function bloodhound_source(query, cb) {
		var fn = engine.ttAdapter();
		return fn(query, cb);
	}

	return {
		displayKey: valueKey,
		source: need_bloodhound ? bloodhound_source : dataset.local,
		templates: make_templates(dataset)
	};
}
