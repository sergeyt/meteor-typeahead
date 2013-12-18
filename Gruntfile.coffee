module.exports = (grunt) ->

  # Project configuration.
	grunt.initConfig
		pkgFile: 'package.json'

		'npm-contributors':
			options:
				commitMessage: 'chore: update contributors'

		bump:
			options:
				commitMessage: 'chore: release v%VERSION%'
				pushTo: 'origin'

		'auto-release':
			options:
				checkTravisBuild: false

		jshint:
			options:
				globals:
					node: true,
					console: true,
					module: true,
					require: true
			dev:
				src: ['*.js', 'demo/*.js']

		coffeelint:
			options:
				no_tabs: {level: 'ignore'}
				indentation: {level: 'ignore'}
			dev: ['*.coffee']

	grunt.loadNpmTasks 'grunt-contrib-jshint'
	grunt.loadNpmTasks 'grunt-coffeelint'
	grunt.loadNpmTasks 'grunt-npm'
	grunt.loadNpmTasks 'grunt-bump'
	grunt.loadNpmTasks 'grunt-auto-release'

	grunt.registerTask 'release', 'Bump the version and publish to NPM.',
		(type) -> grunt.task.run [
			'npm-contributors',
			"bump:#{type||'patch'}",
			'npm-publish'
		]

	grunt.registerTask 'lint', ['coffeelint', 'jshint']
	grunt.registerTask 'test', ['lint']
	grunt.registerTask 'default', ['test']
