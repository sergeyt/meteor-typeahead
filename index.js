/**
 * Activates typeahead behavior for given element.
 * @param element The DOM element to modify.
 */
Meteor.typeahead = function(element){
	var $e = $(element);
	// TODO use input name, id as default value for dataset name
	var name = $e.data('dataset') || 'dataset';
	var limit = $e.data('limit') || 5;
	var template = $e.data('template');
	var local = $e.data('source');

	var dataset = {
		name: name,
		limit: limit,
		local: local
	};

// TODO support handlebars engine and custom templates
//	if (template) {
//		dataset.template = template;
//	}

	$e.typeahead(dataset);

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')){
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}
};