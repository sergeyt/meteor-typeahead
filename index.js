/**
 * Activates typeahead behavior for given element.
 * @param element The DOM element to modify.
 */
Meteor.typeahead = function(element){
	var $e = $(element);
	var name = $e.attr('name') || $e.attr('id') || 'dataset';
	var limit = $e.data('limit') || 5;
	var template = $e.data('template'); // specifies name of custom template
	var data = $e.data('source');

	var dataset = {
		name: name,
		limit: limit,
		local: data
	};

	// support for custom templates
	if (template && Template[template]) {
		dataset.template = template;
		// meet typeahead template engine API to be Hogan compatible
		dataset.engine = {
			compile: function(){
				var tmpl = Template[template];
				return {
					render: function(context){
						return tmpl(context);
					}
				};
			}
		};
	}

	$e.typeahead(dataset);

	// fix to apply bootstrap form-control to tt-hint
	// TODO support other classes if needed
	if ($e.hasClass('form-control')){
		$e.parent('.twitter-typeahead').find('.tt-hint').addClass('form-control');
	}
};