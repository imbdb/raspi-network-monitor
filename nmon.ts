interface NetworkInterface {
  name: string;
  ipv4: string[];
  ipv6: string[];
}

class NetworkMonitor {
  private slackWebhookUrl: string;
  private checkInterval: number;
  private lastConnected = false;
  private lastNetworkState: NetworkInterface[] = [];

  constructor(slackWebhookUrl: string, checkInterval = 30000) {
    this.slackWebhookUrl = slackWebhookUrl;
    this.checkInterval = checkInterval;
  }

  private async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    const networkInterfaces: NetworkInterface[] = [];
    
    // Deno.networkInterfaces() returns all network interfaces
    const interfaces = Deno.networkInterfaces();
    
    // Group by interface name
    const groupedInterfaces = interfaces.reduce((acc: any, interface_) => {
      if (!acc[interface_.name]) {
        acc[interface_.name] = {
          name: interface_.name,
          ipv4: [],
          ipv6: [],
        };
      }
      
      if (interface_.family === "IPv4") {
        acc[interface_.name].ipv4.push(interface_.address);
      } else if (interface_.family === "IPv6") {
        // Filter out link-local addresses
        if (!interface_.address.startsWith("fe80")) {
          acc[interface_.name].ipv6.push(interface_.address);
        }
      }
      
      return acc;
    }, {} as Record<string, NetworkInterface>);

    return Object.values(groupedInterfaces).filter(
      (int) => int.name !== "lo" && (int.ipv4.length > 0 || int.ipv6.length > 0)
    );
  }

  private async checkInternet(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch("https://8.8.8.8", {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }

  private formatMessage(interfaces: NetworkInterface[]): string {
    let message = "🟢 Raspberry Pi connected to internet!\n\n";
    message += "Network Interfaces:\n";

    for (const int of interfaces) {
      message += `\n*${int.name}*\n`;
      
      if (int.ipv4.length > 0) {
        message += "IPv4:\n";
        for (const ip of int.ipv4) {
          message += `• ${ip}\n`;
        }
      }
      
      if (int.ipv6.length > 0) {
        message += "IPv6:\n";
        for (const ip of int.ipv6) {
          message += `• ${ip}\n`;
        }
      }
    }

    return message;
  }

  private async sendSlackNotification(message: string): Promise<void> {
    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending Slack notification:", error);
    }
  }

  private networksChanged(current: NetworkInterface[]): boolean {
    if (this.lastNetworkState.length !== current.length) return true;

    for (let i = 0; i < current.length; i++) {
      const currentInt = current[i];
      const lastInt = this.lastNetworkState[i];

      if (
        currentInt.name !== lastInt.name ||
        !this.arraysEqual(currentInt.ipv4, lastInt.ipv4) ||
        !this.arraysEqual(currentInt.ipv6, lastInt.ipv6)
      ) {
        return true;
      }
    }

    return false;
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && 
           a.every((val, index) => val === b[index]);
  }

  public async run(): Promise<void> {
    console.log("Starting network monitor...");

    while (true) {
      const connected = await this.checkInternet();
      const currentNetworks = await this.getNetworkInterfaces();

      if (
        (connected && !this.lastConnected) ||
        (connected && this.networksChanged(currentNetworks))
      ) {
        const message = this.formatMessage(currentNetworks);
        await this.sendSlackNotification(message);
        console.log(message);
      }

      this.lastConnected = connected;
      this.lastNetworkState = currentNetworks;

      await new Promise((resolve) => setTimeout(resolve, this.checkInterval));
    }
  }
}

// Configuration
const config = {
  slackWebhookUrl: "YOUR_SLACK_WEBHOOK_URL",  // Replace with your webhook URL
  checkInterval: 30000, // 30 seconds
};

// Start the monitor
const monitor = new NetworkMonitor(config.slackWebhookUrl, config.checkInterval);
