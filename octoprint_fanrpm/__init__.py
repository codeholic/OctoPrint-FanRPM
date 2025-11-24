# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import RPi.GPIO as GPIO
import time
import threading
import flask

class FanRPMPlugin(octoprint.plugin.StartupPlugin,
                   octoprint.plugin.TemplatePlugin,
                   octoprint.plugin.AssetPlugin,
                   octoprint.plugin.SettingsPlugin,
                   octoprint.plugin.SimpleApiPlugin):

    def __init__(self):
        self.pulse_count = 0
        self.current_rpm = 0
        self.monitoring = False
        self.monitor_thread = None
        self.tach_pin = 14  # GPIO14 = Pin 8
        self.pulses_per_rev = 2

    def on_after_startup(self):
        self._logger.info("Fan RPM Monitor started")
        self.start_monitoring()

    def on_shutdown(self):
        self._logger.info("Fan RPM Monitor shutting down")
        self.stop_monitoring()

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return dict(
            tach_pin=14,
            pulses_per_rev=2,
            update_interval=2.0,
            enabled=True
        )

    ##~~ AssetPlugin mixin

    def get_assets(self):
        return dict(
            js=["js/fanrpm.js"]
        )

    ##~~ TemplatePlugin mixin

    def get_template_configs(self):
        return [
            dict(type="sidebar",
                 name="Fan RPM",
                 icon="refresh",
                 custom_bindings=True),
            dict(type="settings",
                 custom_bindings=False)
        ]

    ##~~ SimpleApiPlugin mixin

    def get_api_commands(self):
        return dict(
            get_rpm=[]
        )

    def on_api_command(self, command, data):
        if command == "get_rpm":
            return flask.jsonify(rpm=self.current_rpm)

    def on_api_get(self, request):
        return flask.jsonify(rpm=self.current_rpm)

    ##~~ GPIO Functions

    def tach_callback(self, channel):
        """Interrupt handler for tachometer pulses"""
        self.pulse_count += 1

    def setup_gpio(self):
        """Initialize GPIO"""
        try:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.tach_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            GPIO.add_event_detect(self.tach_pin, GPIO.FALLING,
                                  callback=self.tach_callback,
                                  bouncetime=5)
            self._logger.info(f"GPIO {self.tach_pin} configured successfully")
            return True
        except Exception as e:
            self._logger.error(f"Error setting up GPIO: {e}")
            return False

    def cleanup_gpio(self):
        """Clean up GPIO"""
        try:
            GPIO.cleanup()
            self._logger.info("GPIO cleaned up")
        except Exception as e:
            self._logger.error(f"Error cleaning up GPIO: {e}")

    def monitor_rpm(self):
        """Background thread to monitor RPM"""
        update_interval = self._settings.get_float(["update_interval"])
        self._logger.info(f"Starting RPM monitoring with interval {update_interval}s")

        while self.monitoring:
            # Reset counter
            pulse_count_start = self.pulse_count
            self.pulse_count = 0

            # Wait for measurement interval
            time.sleep(update_interval)

            # Calculate RPM
            pulses = self.pulse_count
            rpm = (pulses / self.pulses_per_rev) * (60 / update_interval)
            self.current_rpm = int(rpm)

            # Send update to frontend
            self._plugin_manager.send_plugin_message(self._identifier,
                                                     dict(rpm=self.current_rpm))

            self._logger.info(f"Pulses: {pulses}, RPM: {self.current_rpm}")

    def start_monitoring(self):
        """Start RPM monitoring"""
        if self._settings.get_boolean(["enabled"]):
            self.tach_pin = self._settings.get_int(["tach_pin"])
            self.pulses_per_rev = self._settings.get_int(["pulses_per_rev"])
            
            if self.setup_gpio():
                self.monitoring = True
                self.monitor_thread = threading.Thread(target=self.monitor_rpm)
                self.monitor_thread.daemon = True
                self.monitor_thread.start()
                self._logger.info("RPM monitoring started")

    def stop_monitoring(self):
        """Stop RPM monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        self.cleanup_gpio()
        self._logger.info("RPM monitoring stopped")

    ##~~ Softwareupdate hook

    def get_update_information(self):
        return dict(
            fanrpm=dict(
                displayName="Fan RPM Monitor",
                displayVersion=self._plugin_version,

                # version check: github repository
                type="github_release",
                user="yourusername",
                repo="OctoPrint-FanRPM",
                current=self._plugin_version,

                # update method: pip
                pip="https://github.com/yourusername/OctoPrint-FanRPM/archive/{target_version}.zip"
            )
        )

__plugin_name__ = "Fan RPM Monitor"
__plugin_pythoncompat__ = ">=3,<4"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = FanRPMPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }
