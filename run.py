import os
from backend import create_app

# Load the configuration type from environment variables (defaulting to development)
config_name = os.environ.get('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    # Launch application in local development server mode
    # Standard Flask port is 5000
    app.run(host='127.0.0.1', port=5000)
