"use client";

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import MqttScale from "../components/MqttScale";

import { SCALE_MANUFACTURERS, COMMAND_SETS } from "../constants/scaleCommands";

// Removed local SCALE_COMMANDS definition

export default function App() {
  const clientRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastWeight, setLastWeight] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [unit, setUnit] = useState("kg");
  const [serialNumber, setSerialNumber] = useState(null);
  const [log, setLog] = useState([]);
  const [isStale, setIsStale] = useState(false);
  const lastPacketTime = useRef(Date.now());
  const pollingInterval = useRef(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  const [topic, setTopic] = useState("scale/S413NS0RA05854");
  const [scaleType, setScaleType] = useState("typeA"); // "typeA" | "typeB"
  const [manufacturer, setManufacturer] = useState(SCALE_MANUFACTURERS.METTLER);

  const topicRef = useRef(topic); // Keep a ref for the message callback

  // Helper to get current commands based on manufacturer
  const getCommands = () => COMMAND_SETS[manufacturer]?.commands || {};

  // Environment variables
  const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST;
  const MQTT_URL = `wss://${MQTT_HOST}`;
  const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME;
  const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

  // Update ref when topic changes
  useEffect(() => {
    topicRef.current = topic;
  }, [topic]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  // Check for stale connection
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        const timeSinceLastPacket = Date.now() - lastPacketTime.current;
        setIsStale(timeSinceLastPacket > 5000);
      } else {
        setIsStale(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const appendLog = (msg) => {
    setLog((prev) => [
      { ts: new Date().toLocaleTimeString(), msg },
      ...prev.slice(0, 49),
    ]);
  };



  const parseWeight = (str) => {
    // Legacy / Type A: "B + 79.699 kg"
    if (scaleType === "typeA") {
      const match = str.match(/([+-]?\s*\d*\.?\d+)/);
      if (!match) return null;
      return parseFloat(match[0].replace(/\s/g, ""));
    }
    
    // Avery Type
    if (scaleType === "avery") {
      // Remove control chars (STX/ETX and others)
      // eslint-disable-next-line no-control-regex
      const clean = str.replace(/[\x00-\x1F\x7F-\x9F]/g, " ").trim();
      // Look for the float. The format seems to be: STATUS_CODE  WEIGHT  UNIT
      // e.g. "99   1.427 kg"
      // We'll extract the last number before "kg" or just the safest float.
      const match = clean.match(/(\d+\.\d+)/);
      if (match) {
        return parseFloat(match[1]);
      }
      return null;
    }

    return null;
  };

  const handleConnect = () => {
    if (isConnected || isConnecting) return;

    if (!MQTT_HOST) {
        appendLog("Error: NEXT_PUBLIC_MQTT_HOST is not defined in .env");
        return;
    }

    setIsConnecting(true);
    appendLog(`Connecting to MQTT broker on topic: ${topic}...`);

    const options = {
      reconnectPeriod: 2000,
    };

    if (MQTT_USERNAME) {
        options.username = MQTT_USERNAME;
    }
    if (MQTT_PASSWORD) {
        options.password = MQTT_PASSWORD;
    }

    const client = mqtt.connect(MQTT_URL, options);

    client.on("connect", () => {
      setIsConnecting(false);
      setIsConnected(true);
      appendLog("Connected to MQTT broker.");

      client.subscribe(topic, (err) => {
        if (err) {
          appendLog(`Subscribe error: ${err.message}`);
        } else {
          appendLog(`Subscribed to topic: ${topic}`);
        }
      });
    });

    client.on("message", (msgTopic, message) => {
      if (msgTopic === topicRef.current) {
        lastPacketTime.current = Date.now();
        setIsStale(false);
        const sizeBytes =
          message && typeof message.length === "number"
            ? message.length
            : new TextEncoder().encode(String(message)).length;

        try {
          const payload = JSON.parse(message.toString());
          // appendLog(`Received raw: ${message.toString()}`);

          // Newest format: { serialNumber, timestamp, stable, weight, unit, meta: { is_tared } }
          if (typeof payload.weight !== "undefined" && typeof payload.stable !== "undefined") {
             const weight = payload.weight;
             setLastWeight(weight);
             // handle timestamp (check if seconds or ms)
             let ts = payload.timestamp;
             if (ts && typeof ts === 'number' && ts < 10000000000) {
                 ts = ts * 1000; // Convert sec to ms if needed
             }
             setLastTimestamp(ts ? new Date(ts).toISOString() : new Date().toISOString());
             
             if (payload.unit) setUnit(payload.unit);
             if (payload.serialNumber) setSerialNumber(payload.serialNumber);
             
             appendLog(`Received: ${weight} ${payload.unit || ""} (${sizeBytes} bytes)`);

          } else if (payload.rawData) {
            // Intermediate format: { rawData: "B + 79.699 kg", ... }
            const val = parseWeight(payload.rawData);
            if (val !== null) {
              setLastWeight(val);
              setLastTimestamp(payload.timestamp || new Date().toISOString());
              // Try to guess unit from raw string if possible, or default to kg
              if (payload.rawData.toLowerCase().includes("lb")) setUnit("lb");
              else setUnit("kg");

              if (payload.serialNumber) {
                setSerialNumber(payload.serialNumber);
              }
              appendLog(`Received: ${payload.rawData} (${sizeBytes} bytes)`);
            } else {
              appendLog(`Could not parse weight from: ${payload.rawData}`);
            }
          } else if (typeof payload.weight !== "undefined") {
            // Fallback for old format
            setLastWeight(payload.weight);
            setLastTimestamp(payload.ts || new Date().toISOString());
            setUnit("kg"); // Default
            appendLog(`Received weight: ${payload.weight}`);
          } else {
            appendLog(`Unknown payload structure: ${message.toString()}`);
          }
        } catch (e) {
          appendLog(`Invalid JSON: ${message.toString()}`);
        }
      }
      
    });

    client.on("error", (err) => {
      appendLog(`MQTT error: ${err.message}`);
    });

    client.on("close", () => {
      setIsConnected(false);
      setIsConnecting(false);
      setIsStale(false);
      appendLog("Disconnected from MQTT broker.");
    });

    clientRef.current = client;
  };

  const handleDisconnect = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    
    if (!clientRef.current) return;

    // Send STOP command if we are currently connected
    if (isConnected) {
        appendLog("Sending STOP command...");
        // Use the raw publish here to ensure it's sent before we close
        const cmdTopic = `${topic}/command`;
        // commands might need to be resolved from state or ref if manufacturer changes dynamically while connected
        // but for now, rely on render state capture
        const cmds = COMMAND_SETS[manufacturer]?.commands;
        if (cmds && cmds.STOP) {
            clientRef.current.publish(cmdTopic, cmds.STOP, { qos: 0 }, (err) => {
                if (!err) {
                    appendLog("STOP command sent.");
                }
                finishDisconnect();
            });
            return;
        }
        finishDisconnect();
    } else {
        finishDisconnect();
    }
  };

  const finishDisconnect = () => {
    if (clientRef.current) {
      // Pass false to wait for pending packets (like the STOP command)
      clientRef.current.end(false, () => {
        appendLog("Disconnected gracefully.");
      });
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsStale(false);
    appendLog("Manual disconnect.");
  };

  const publishCommand = (command) => {
    if (!clientRef.current || !isConnected) {
      appendLog("Cannot send command: not connected.");
      return;
    }
    const cmdTopic = `${topic}/command`;
    
    // Calculate size
    let cmdSize = 0;
    if (typeof command === "string") {
      cmdSize = new TextEncoder().encode(command).length;
    } else if (command instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer(command))) {
      cmdSize = command.length;
    }

    // If it's a buffer/array, we might want to log it as hex string for clarity
    const logMsg = typeof command === "string" ? `"${command}"` : `[Hex: ${Array.from(command).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`;

    clientRef.current.publish(cmdTopic, command, { qos: 0 }, (err) => {
      if (err) {
        appendLog(`Failed to publish command ${logMsg}: ${err.message}`);
      } else {
        appendLog(`Published command ${logMsg} (${cmdSize} bytes) to ${cmdTopic}`);
      }
    });
  };

  const handlePrint = () => {
    // STX (0x02) + "PP" + ETX (0x03)
    const buffer = new Uint8Array([0x02, 0x50, 0x50, 0x03]);
    publishCommand(buffer);
  };

  const handleStart = () => {
    // Clear any existing interval just in case
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    if (scaleType === "avery") {
      appendLog("Starting Avery polling (sending PP every 300ms)...");
      // Send once immediately
      handlePrint();
      // Then repeat
      pollingInterval.current = setInterval(() => {
        if (!isConnected) {
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
            }
            return;
        }
        handlePrint();
      }, 100);
    } else {
        // Continuous mode or Type A: send once
        appendLog(`Sending start command (${manufacturer})...`);
        publishCommand(getCommands().START);
    }
  };

  const handleStop = () => {
    if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
        appendLog("Stopped Avery polling.");
    }
    appendLog("Sending STOP command...");
    publishCommand(getCommands().STOP);
  };

  const handleZero = () => {
    publishCommand(getCommands().ZERO);
  };

  const handleGetSerial = () => {
    publishCommand(getCommands().GET_SERIAL);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0fdf4", // Light green background basically white
        color: "#1f2937", // Dark gray text
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <MqttScale 
        isConnected={isConnected}
        isConnecting={isConnecting}
        isStale={isStale}
        topic={topic}
        lastWeight={lastWeight}
        lastTimestamp={lastTimestamp}
        unit={unit}
        serialNumber={serialNumber}
        log={log}
        mqttHost={MQTT_HOST}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onStart={handleStart}
        onStop={handleStop}
        onZero={handleZero}
        onGetSerial={handleGetSerial}
        onTopicChange={setTopic}
        onPrint={handlePrint}
        scaleType={scaleType}
        onScaleTypeChange={setScaleType}
        manufacturer={manufacturer}
        onManufacturerChange={setManufacturer}
      />
    </div>
  );
}
