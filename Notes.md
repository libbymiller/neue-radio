sudo raspi-config # expand file system, reboot
sudo apt-get update
sudo apt-get install rpi-chromium-mods xvfb
xvfb-run chromium-browser

# To enable remote debugging

On the Pi:

    xvfb-run chromium-browser --remote-debugging-port=9222 --app=google.com

In another terminal on the Pi:

    ssh -L 0.0.0.0:9223:localhost:9222 localhost -N

Then, on another computer with a web browser visit:

http://raspberrypi.local:9223/


Disable same-origin policy:

    --disable-web-security --user-data-dir


Possible command flags: http://peter.sh/experiments/chromium-command-line-switches/

Remote debugging on external machine:
  http://superuser.com/questions/630923/forward-connections-on-0-0-0-080-to-127-0-0-19091

Audio:
  https://github.com/njh/bbcradio-tingapp#making-usb-audio-default

# Install with systemd

    cd manager && JOBS=MAX npm install --production && cd ..
    sudo cp systemd/* /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl start manager

You should hear audio!

Enable on startup:

    sudo systemctl enable manager
    sudo systemctl enable manager-web-server
