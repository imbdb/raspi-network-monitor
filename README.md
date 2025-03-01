# Raspberry Pi Network Monitor

This service monitors your Raspberry Pi's network connections and sends you a Slack notification whenever it connects to the internet, including details about all network interfaces and IP addresses.

## Features

- Monitors internet connectivity
- Detects all network interfaces (Ethernet, WiFi, etc.)
- Captures both IPv4 and IPv6 addresses
- Sends detailed Slack notifications
- Runs as a system service that starts automatically
- Uses Deno for a lightweight, dependency-free solution

## Prerequisites

- Raspberry Pi (any model) with Raspberry Pi OS
- Internet connection
- Slack workspace where you can create apps

## Setup Instructions

### 1. Install Deno on Raspberry Pi

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required dependencies
sudo apt install -y unzip

# Download and install Deno
curl -fsSL https://deno.land/install.sh | sh

# Add Deno to your PATH
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
deno --version
```

### 2. Create a Slack App with Webhook

1. Go to [Slack API Apps page](https://api.slack.com/apps)
2. Click "Create New App" and choose "From scratch"
3. Enter a name for your app (e.g., "Raspberry Pi Monitor") and select your workspace
4. Click "Create App"
5. In the left sidebar, under "Features", click on "Incoming Webhooks"
6. Toggle "Activate Incoming Webhooks" to "On"
7. Scroll down and click "Add New Webhook to Workspace"
8. Select the channel where you want to receive notifications
9. Click "Allow"
10. Copy the Webhook URL (it will look like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### 3. Create the Network Monitor Script

1. Create a directory for the script:
   ```bash
   mkdir -p ~/network-monitor
   cd ~/network-monitor
   ```

2. Create the script file:
   ```bash
   nano network-monitor.ts
   ```

3. Copy and paste the entire script from the code section above

4. Replace `YOUR_SLACK_WEBHOOK_URL` with your actual Slack webhook URL

5. Save the file (Ctrl+O, then Enter, then Ctrl+X)

### 4. Test the Script

Run the script manually to ensure it works:

```bash
deno run --allow-net --allow-read --allow-sys network-monitor.ts
```

You should see "Starting network monitor..." in the console, and shortly receive a Slack notification with your network details.

### 5. Set Up as a System Service

1. Create a systemd service file:
   ```bash
   sudo nano /etc/systemd/system/network-monitor.service
   ```

2. Add the following content, replacing the paths with your actual paths:
   ```ini
   [Unit]
   Description=Deno Network Monitor
   After=network.target

   [Service]
   ExecStart=/home/pi/.deno/bin/deno run --allow-net --allow-read --allow-sys /home/pi/network-monitor/network-monitor.ts
   Restart=always
   User=pi
   WorkingDirectory=/home/pi/network-monitor

   [Install]
   WantedBy=multi-user.target
   ```

3. Save the file (Ctrl+O, then Enter, then Ctrl+X)

4. Enable the service to start on boot:
   ```bash
   sudo systemctl enable network-monitor.service
   ```

5. Start the service:
   ```bash
   sudo systemctl start network-monitor.service
   ```

6. Check the service status:
   ```bash
   sudo systemctl status network-monitor.service
   ```

You should see "Active: active (running)" if everything is working correctly.

## Troubleshooting

### Service Won't Start

Check the logs for errors:

```bash
sudo journalctl -u network-monitor.service -e
```

Common issues:
- Incorrect paths in the service file
- Missing permissions (--allow-net, --allow-read)
- Syntax errors in the script

### No Notifications

- Verify your Slack webhook URL is correct
- Check if your Raspberry Pi has internet connectivity
- Ensure the script is running: `ps aux | grep network-monitor`
- Confirm your Slack app has the proper permissions

### Making Changes

If you need to modify the script:
1. Edit the script file
2. Restart the service:
   ```bash
   sudo systemctl restart network-monitor.service
   ```

## Customization

### Change Notification Frequency

Adjust the `checkInterval` value in the script (in milliseconds):

```typescript
const config = {
  slackWebhookUrl: "YOUR_SLACK_WEBHOOK_URL",
  checkInterval: 60000, // 60 seconds
};
```

### Add More Information to Notifications

Modify the `formatMessage` function in the script to include additional system information.

### Enhance Slack Notifications

You can customize your Slack notifications further by using [Slack's Block Kit](https://api.slack.com/block-kit) to add formatted text, buttons, and other interactive elements. This would require modifying the `sendSlackNotification` function in the script.

## Uninstalling

To remove the service:

```bash
sudo systemctl stop network-monitor.service
sudo systemctl disable network-monitor.service
sudo rm /etc/systemd/system/network-monitor.service
sudo systemctl daemon-reload
```

Then delete the script directory:

```bash
rm -rf ~/network-monitor
```

To remove the Slack app:
1. Go to [Slack API Apps page](https://api.slack.com/apps)
2. Select your Raspberry Pi Monitor app
3. Scroll to the bottom and click "Delete App"
4. Confirm the deletion
