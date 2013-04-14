"use strict";
module.exports = function(grunt) {
	var _ = grunt.util._,
		util = require('util'),
		path = require('path');

	var BlockParser = function(origHtml, task, options) {
		this.origHtml = origHtml;
		this.task = task;
		this.options = options;
		this._blockRE = new RegExp(

			// Indent whitespace
			'(^[ \t]+)?'

			// Begin tag
			+ '<!--[ ]*' + options.tagName

				// Type
				+ ':([^ \\-]+)'

				// Args
				+ '(?:[ ]+(.+?))?'

				+ '[ ]*-->'

			// Contents
			+ '(([^\\0]|\\0)+?)'

			// End Tag
			+ '<!--[ ]*end' + options.tagName + '[ ]*-->'

		, 'gm');
	};

	_.extend(BlockParser.prototype, {

		parsedHtml: '',

		run: function() {
			var match,
				lastIndex = 0;

			while(!_.isNull(match = this._blockRE.exec(this.origHtml))) {
				var indent = match[1] || '',
					type = match[2],
					args = match[3],
					contents = match[4];

				// Append the HTML before the matched block to the output HTML.
				this.parsedHtml += this.origHtml.substring(lastIndex, match.index) + indent;
				lastIndex = this._blockRE.lastIndex;

				grunt.event.emit(this.task.name + '.blockfound', { type: type, args: args, contents: contents, contentsFull: match[0] });

				var parser = null;

				// User-defined type parser.
				if (_.isFunction(this.options.typeParser[type]))
					parser = this.options.typeParser[type];

				// Built-in type parsers.
				else if (_.isFunction(this.typeParser[type]))
					parser = this.typeParser[type];

				if (parser) {
					var replace = parser.apply(this, [ { type: type, args: args, contents: contents, indent: indent } ]);

					if (_.isString(replace))
						this.parsedHtml += replace;

					else if (_.isArray(replace))
						this.parsedHtml += replace.join('\n' + indent);
				}
			}

			this.parsedHtml += this.origHtml.substr(lastIndex);
		},

		splitArgs: function(args, limit) {
			if (!_.isString(args))
				return args;

			if (limit == 1)
				return [ args ];

			var re = /^([^ \t]+)(?:[ \t]+(.+)])?$/,
				ret = [],
				match;

			if (!_.isFinite(limit))
				limit = -1;

			while (_.isString(args) && !_.isNull(match = args.match(re))) {
				ret.push(match[1]);
				args = match[2];

				if (limit > 0)
					limit--;

				if (limit == 0) {
					ret.push(args);
					return ret;
				}
			}

			return ret;
		},

		getTags: function(elementName, html) {
			var tagRE = new RegExp('<' + elementName + '( .+?)>', 'ig'),
				attrRE = / ([a-z0-9_\-]+)="([^"]+)"/ig,
				tags = [],
				tagMatch, attrMatch;

			while (!_.isNull(tagMatch = tagRE.exec(html))) {
				var tag = {
					_html: tagMatch[0]
				};

				while (!_.isNull(attrMatch = attrRE.exec(tagMatch[1]))) {
					tag[attrMatch[1]] = attrMatch[2];
				}

				tags.push(tag);
			}

			return tags;
		},

		typeParser: {
			requirejs: function(opts) {
				var args = opts.args;

				if (!_.isString(args))
					grunt.fail.warn('Missing arguments: <data-main> [<dest> [<target>]]');

				var contents = opts.contents,
					dest = null,
					main = null,
					target = this.options.target,
					hasTag = false,
					outTags = [];

				if (_.isString(args)) {
					var splitArgs = args.split(/[ \t]+/);

					if (splitArgs.length < 1)
						grunt.fail.warn('Missing arguments: <data-main> [<dest> [<target>]]');

					main = splitArgs.shift();
					grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Set main to " + main });

					if (splitArgs.length) {
						dest = { short: splitArgs[0], full: path.join(this.options.baseUrl, splitArgs[0]) };
						grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Set destination to " + dest.full });
						splitArgs.shift();
					}
					else {
						dest = { short: main + '.js', full: path.join(this.options.baseUrl, main + '.js') };
					}

					if (splitArgs.length) {
						target = splitArgs.shift();
						grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Set target to " + target });
					}
				}

				_.each(this.getTags('script', contents), function(tag){
					grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Parsing tag: " + tag._html });

					if (dest) {
						if (!_.isString(tag.src))
							grunt.fail.warn("Tag missing src attribute: " + tag._html);

						else if (tag.src.match(/^(\/|(\w+:\/\/))/i)) {
							grunt.event.emit(this.task.name + '.notice', { message: "Skipping root or absolute URL: " + tag._html });
						}
						else {
							hasTag = true;
							grunt.event.emit(this.task.name + '.concat', { target: target, src: tag.src, dest: dest.full });
						}
					}

				}, this);

				if (hasTag) {
					outTags.push('<script src="' + dest.short + '"></script>');
					grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Added tag: " + outTags[outTags.length - 1] });

					grunt.event.emit(this.task.name + '.requirejs', {
						target: target,
						src: main + '.js',
						dest: dest.full,
						options: {
							baseUrl: path.dirname(main),
							name: path.basename(main),
							out: dest.full,
							mainConfigFile: main + '.js'
						}
					});

					grunt.event.emit(this.task.name + '.uglify', { target: target, src: dest.full, dest: dest.full });
				}

				return outTags;
			},

			js: function(opts) {
				var args = opts.args,
					contents = opts.contents,
					dest = null,
					hasTag = false,
					target = this.options.target,
					outTags = [];

				if (_.isString(args)) {
					var splitArgs = args.split(/[ \t]+/);
					if (splitArgs.length > 0) {
						dest = { short: splitArgs[0], full: path.join(this.options.baseUrl, splitArgs[0]) };
						grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Set destination to " + dest.full });
					}
				}

				_.each(this.getTags('script', contents), function(tag){
					grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Parsing tag: " + tag._html });

					if (dest) {
						if (!_.isString(tag.src))
							grunt.fail.warn("Tag missing src attribute: " + tag._html);

						else if (tag.src.match(/^(\/|(\w+:\/\/))/i)) {
							grunt.event.emit(this.task.name + '.notice', { message: "Skipping root or absolute URL: " + tag._html });
						}
						else {
							if (!hasTag) {
								hasTag = true;

								outTags.push('<script src="' + dest.short + '"></script>');
								grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Added tag: " + outTags[outTags.length - 1] });

								grunt.event.emit(this.task.name + '.uglify', { target: target, src: dest.full, dest: dest.full });
							}

							grunt.event.emit(this.task.name + '.concat', { target: target, src: tag.src, dest: dest.full });
						}
					}

					if (_.isString(tag['data-main'])) {
						var requireDest = { short: _.isString(tag['data-dest']) ? tag['data-dest'] : tag['data-main'] };
						requireDest.full = path.join(this.options.baseUrl, requireDest.short);

						var requireTarget = tag['data-target'] ? tag['data-target'] : target;

						outTags.push('<script src="' + requireDest.short + '"></script>');
						grunt.event.emit(this.task.name + '.notice', { verbose: true, message: "Added tag: " + outTags[outTags.length - 1] });

						grunt.event.emit(this.task.name + '.requirejs', {
							target: requireTarget,
							src: tag['data-main'] + '.js',
							dest: requireDest.full,
							options: {
								baseUrl: path.dirname(tag['data-main']),
								name: path.basename(tag['data-main']),
								out: requireDest.full,
								mainConfigFile: tag['data-main'] + '.js'
							}
						});

						grunt.event.emit(this.task.name + '.uglify', { target: target, src: requireDest.full, dest: requireDest.full });
					}

				}, this);

				return outTags;
			}
		}
	});

	grunt.registerMultiTask('htmlbuild', 'Variation of usemin.', function() {
		var options = this.options({
			tagName: 'htmlbuild',
			baseDir: '',
			target: 'htmlbuild',
			typeParser: {}
		});

		var initFilesDest = function(config, target, dest) {
			if (!config.hasOwnProperty(target))
				config[target] = {};

			if (!config[target].hasOwnProperty('files'))
				config[target].files = [];

			var entry = { dest: dest, src: [] };
			config[target].files.push(entry);

			return entry.src;
		};

		this.files.forEach(function(file) {
			if (file.src.length != 1)
				grunt.fail.warn('Must specify only one source per dest.');

			var filepath = file.src[0];

			if (grunt.file.isFile(filepath)) {
				grunt.log.subhead('Processing: ' + filepath);

				try {
					var parser = new BlockParser(grunt.file.read(filepath), this, options),
						configChanged = {},
						concat = grunt.config(options.concat || 'concat'),
						uglify = grunt.config(options.uglify || 'uglify'),
						requirejs = grunt.config(options.requirejs || 'requirejs'),
						concatDests,
						uglifyDests;

					grunt.event.on(this.name + '.blockfound', function(ev) {
						grunt.log.subhead("Block found: " + grunt.log.wordlist([
							ev.type + ' ' + ev.args
						]));

						concatDests = {};
						uglifyDests = {};
					});

					grunt.event.on(this.name + '.notice', function(ev) {
						grunt[ev.verbose ? 'verbose' : 'log'].writeln(ev.message);
					});

					grunt.event.on(this.name + '.concat', function(ev) {
						grunt.log.writeln("Added concat:" + ev.target + " " + grunt.log.wordlist([ ev.src, ev.dest ], { separator: ' -> ' }));
						configChanged['concat'] = concat;

						if (!concatDests[ev.target])
							concatDests[ev.target] = {};

						if (!concatDests[ev.target][ev.dest])
							concatDests[ev.target][ev.dest] = initFilesDest(concat, ev.target, ev.dest);

						concatDests[ev.target][ev.dest].push(ev.src);
					});

					grunt.event.on(this.name + '.uglify', function(ev) {
						grunt.log.writeln("Added uglify:" + ev.target + " " + grunt.log.wordlist([ ev.src, ev.dest ], { separator: ' -> ' }));
						configChanged['uglify'] = uglify;

						if (!uglifyDests[ev.target])
							uglifyDests[ev.target] = {};

						if (!uglifyDests[ev.target][ev.dest])
							uglifyDests[ev.target][ev.dest] = initFilesDest(uglify, ev.target, ev.dest);

						uglifyDests[ev.target][ev.dest].push(ev.src);
					});

					grunt.event.on(this.name + '.requirejs', function(ev) {
						grunt.log.writeln("Added requirejs:" + ev.target + " " + grunt.log.wordlist([ ev.src, ev.dest ], { separator: ' -> ' }));
						configChanged['requirejs'] = requirejs;

						if (requirejs.hasOwnProperty(ev.target))
							grunt.fail.warn("A requirejs config already exists for the target: " + ev.target + '.');

						requirejs[ev.target] = _.extend(
							{ options: ev.options },
							requirejs[ev.target]
						);

					});

					parser.run();
					grunt.verbose.writeln("Run complete");

					if (configChanged) {
						grunt.log.subhead("Config is now:")
						_.each(configChanged, function(val, key) {
							grunt.config(key, val);
							grunt.log.writeln('\n' + key + ':\n' + util.inspect(val, false, 4, true));
						});
					}

					try {
						grunt.file.write(file.dest, parser.parsedHtml);
					}
					catch (e) {
						grunt.verbose.error(e);
						grunt.fail.warn('Failed to write dest file: ' + file.dest);
					}

				} catch (e) {
					grunt.verbose.error(e);
					grunt.fail.warn('Failed to read file: ' + filepath);
				}
			}
		}, this);
	});
};