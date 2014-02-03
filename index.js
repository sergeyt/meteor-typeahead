/**
 * Activates typeahead behavior for given element.
 * @param element The DOM element to modify.
 * @param source The custom data source.
 */
Meteor.typeahead = function(element, source) {
	var $e = $(element);
	var datasets = resolve_datasets($e, source);

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

function resolve_datasets($e, source) {
	var datasets = $e.data('sets');
	if (datasets) {
		return datasets.map(function(ds) {
			return wrap(ds);
		});
	}

	var name = $e.attr('name') || $e.attr('id') || 'dataset';
	var limit = $e.data('limit');
	var template = $e.data('template'); // specifies name of custom template
	var displayKey = $e.data('display-key');

	if (!source) {
		source = $e.data('source') || [];
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
	setup_template(dataset, template);

	if (Array.isArray(dataset.local)) {
		return wrap(dataset);
	}

	return dataset;
}

function setup_template(dataset, template) {
	if (!template) return;
	var tmpl = Template[template];
	dataset.template = function(context) {
		return tmpl(context);
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
