"use client";

import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import MqttScale from "../components/MqttScale";

// ====== COMMAND MAPPING - EASILY CHANGE COMMAND SET HERE ======
const SCALE_COMMANDS = {
  START: "S",   // Command to start streaming data
  ZERO: "Z",    // Command to zero
  TARE: "T",    // Tare command
  GET_SERIAL: "I4", // Command to get serial number (Standard SICS)
};

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

  /* eslint-disable react-hooks/exhaustive-deps */
  const [topic, setTopic] = useState("CKRG123");
  const topicRef = useRef(topic); // Keep a ref for the message callback

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
    // Expected format: "B + 79.699 kg" or similar
    // Match optional sign, optional space, then number
    const match = str.match(/([+-]?\s*\d*\.?\d+)/);
    if (!match) return null;
    // Remove any spaces (like "+ 79") before parsing
    return parseFloat(match[0].replace(/\s/g, ""));
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

          // Newest format: { stable_weight, dynamic_weight, unit, ... }
          if (typeof payload.dynamic_weight !== "undefined") {
             const weight = payload.dynamic_weight; // or payload.stable_weight
             setLastWeight(weight);
             setLastTimestamp(payload.timestamp || new Date().toISOString());
             if (payload.unit) setUnit(payload.unit);
             
             // Optional: handle tare_weight or other fields if needed 
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
    if (!clientRef.current) return;
    clientRef.current.end(true);
    clientRef.current = null;
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
    const cmdTopic = `${topic}/commands`;
    // Calculate size
    const cmdSize = new TextEncoder().encode(command).length;
    
    clientRef.current.publish(cmdTopic, command, { qos: 0 }, (err) => {
      if (err) {
        appendLog(`Failed to publish command "${command}": ${err.message}`);
      } else {
        appendLog(`Published command "${command}" (${cmdSize} bytes) to ${cmdTopic}`);
      }
    });
  };

  const handleStart = () => {
    publishCommand(SCALE_COMMANDS.START);
  };

  const handleZero = () => {
    publishCommand(SCALE_COMMANDS.ZERO);
  };

  const handleGetSerial = () => {
    publishCommand(SCALE_COMMANDS.GET_SERIAL);
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
        onZero={handleZero}
        onGetSerial={handleGetSerial}
        onTopicChange={setTopic}
      />
    </div>
  );
}
