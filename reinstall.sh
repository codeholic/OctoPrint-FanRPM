#!/bin/bash
# Script to install/reinstall the plugin in development mode

echo "Checking for existing installation..."
if pip show Fan-RPM-Monitor >/dev/null 2>&1; then
    echo "Uninstalling existing version..."
    pip uninstall -y Fan-RPM-Monitor
fi

echo "Installing plugin in development mode..."
pip install -e .

if [ $? -eq 0 ]; then
    echo "Done! Please restart OctoPrint for changes to take effect."
    echo ""
    echo "To restart OctoPrint:"
    echo "  sudo service octoprint restart"
    echo ""
    echo "To view logs:"
    echo "  tail -f ~/.octoprint/logs/octoprint.log | grep -i fan"
else
    echo "Installation failed!"
    exit 1
fi
