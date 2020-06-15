/*
Offline mode hack

Since AJAX calls are impossible when the page is loaded using file: protocol
due to CORS failing, fake AJAX by loading javascript files that call us back
with data.

These javascript files can be generated with a script like this:

find lang/ data/ -type f -name '*.txt' |
while read -r file; do
  echo 'document.currentScript.callback(' > "$file.js"
  cat "$file" >> "$file.js"
  echo ')' >> "$file.js"
done

It exploits the fact, that a valid json is also a valid javascript.
Make sure to only run it on valid json files.
Running it on untrusted data may lead to arbitrary code execution!
*/

if (window.location.protocol === 'file:') {
	// Minimal $.ajax implementation just to make it work.
	// Errors are not handled. It may even be impossible to detect them.
	$.ajax = function(args) {
		var script_el = document.createElement('script')
		script_el.callback = function(data) {
			// Remove the script.
			// We got the data so it is no longer needed.
			script_el.remove()
			args.success(data)
			args.complete()
		}
		script_el.setAttribute('type', 'text/javascript')
		// Instead of the requested file, load a script with .js suffix.
		script_el.setAttribute('src', args.url + '.js')
		// Append the script element which triggers loading.
		document.body.append(script_el)
	}
}
