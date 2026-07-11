import os
from flask import Blueprint, send_file, render_template_string

docs_bp = Blueprint("docs", __name__)

SWAGGER_UI_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Swagger UI for CamGuard API" />
  <title>CamGuard API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -margin-top-0;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>
"""

@docs_bp.route("/docs")
def render_swagger_ui():
    """Render the Swagger UI html page."""
    return render_template_string(SWAGGER_UI_TEMPLATE)

@docs_bp.route("/openapi.yaml")
def get_openapi_spec():
    """Serve the raw openapi.yaml specification file."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    openapi_path = os.path.join(backend_dir, "openapi.yaml")
    return send_file(openapi_path, mimetype="text/yaml")
