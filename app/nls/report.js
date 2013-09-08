define({
	root: {
		format_number: function(num){
			num += '';

			var split = num.split('.');

			if (split.length)
				split[0] = split[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');

			return split.join('.');
		},

		compact_bytes: function(bytes){
			bytes = parseInt(bytes);

			if (bytes >= 1000 * 1024 * 1024 * 1024) {
				return this['format_number'](Math.round(bytes * 100 / 1024 / 1024 / 1024 / 1024) / 100) + ' ' + (this['byte_terabyte'] || 'TB');
			}
			else if (bytes >= 1000 * 1024 * 1024) {
				return this['format_number'](Math.round(bytes * 100 / 1024 / 1024 / 1024) / 100) + ' ' + (this['byte_gigabyte'] || 'GB');
			}
			else if (bytes >= 1000 * 1024) {
				return this['format_number'](Math.round(bytes * 100 / 1024 / 1024) / 100) + ' ' + (this['byte_megabyte'] || 'MB');
			}
			else if (bytes >= 1000) {
				return this['format_number'](Math.round(bytes * 100 / 1024) / 100) + ' ' + (this['byte_kilobyte'] || 'KB');
			}
			else if (bytes == 1) {
				return this['format_number'](bytes) + ' ' + (this['byte_byte'] || 'byte');
			}
			else {
				return this['format_number'](bytes) + ' ' + (this['byte_bytes'] || 'bytes');
			}
		},

		byte_byte: 'byte',
		byte_bytes: 'bytes',
		byte_kilobyte: 'KB',
		byte_megabyte: 'MB',
		byte_gigabyte: 'GB',
		byte_terabyte: 'TB',

		footer: 'Report generated using <%= link %>.',
		footer_long: 'Report generated on <%- created %> using <%= link %>.',
		title: 'Disk Usage Report',
		title_long: 'Disk Usage Report for: <b><%- name %></b>',
		total_size: 'Total Size: <%- total %> (<%- direct %> in this directory alone)',
		total_files: 'Total Files: <%- total %> (<%- direct %> in this directory alone)',

		tab_dirs: 'Contents',
		tab_files: 'File List',
		tab_modified: 'Last Modified',
		tab_sizes: 'File Sizes',
		tab_ext: 'File Types',
		tab_top: 'Top 100',

		message_loading: 'Loading...',
		message_settings: 'The report could not be loaded. Error: <%= status %>',
		message_settings_200: 'The settings file for the report is corrupted or is not JSON.',
		message_settings_304: 'The settings file for the report is corrupted or is not JSON.',
		message_settings_404: 'The report was not found.<br>Verify that the web address is correct and refresh to try again.',
		message_settings_timeout: 'The settings file timed out while trying to load.<br>Check your internet connection and refresh to try again.',
		message_settings_invalid: 'The settings file for the report has invalid values.'
	}
});