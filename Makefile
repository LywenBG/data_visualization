# Borderless — donnees locales, bibliotheque D3 via CDN
.PHONY: serve check check-visual
serve:
	python3 -m http.server 8000
check:
	node --check src/app.js
	node tests/check_js_logic.js
	node tests/check_new_features.js
	python3 tests/check_data.py
	python3 tests/check_interface.py
check-visual:
	python3 tests/check_layout_browser.py

# Vérification du scénario de navigation
check-story:
	node tests/check_story_flow.js
