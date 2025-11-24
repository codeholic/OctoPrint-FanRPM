#!/bin/bash
# Script to reinstall the plugin in development mode

echo "Uninstalling old version..."
pip uninstall -y OctoPrint-FanRPM

echo "Installing plugin in development mode..."
pip install -e .

echo "Done! Please restart OctoPrint for changes to take effect."
echo "To restart OctoPrint: sudo service octoprint restart"
