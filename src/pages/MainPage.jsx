import { useState, useEffect, useRef, useNavigate } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LightModeIcon from "@mui/icons-material/LightMode";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';

import { parseJwt } from "../utils/jwt";

import mqtt from "mqtt";
import "../App.css";
import { Refresh } from "@mui/icons-material";

function MainPage() {
  const [devices, setDevices] = useState([
    {
      Device: {
        DeviceID: "Test",
        DeviceName: "Test Device (Template)",
        IsFahrenheit: false,
        LightTime: 10,
        TemperatureTime: 10,
        Location: 1,
      },
      unverified: false,
      data: { light: { lightlevel: 1023 }, temp: { temperature: 22, humidity: 50 } },
    },
    {
      Device: {
        DeviceID: "Test2",
        DeviceName: "Test Device 2 (Template)",
        IsFahrenheit: true,
        LightTime: 10,
        TemperatureTime: 10,
        Location: 1,
      },
      unverified: true,
      data: { light: { lightlevel: 1123 }, temp: { temperature: 28, humidity: 52 } },
    },
  ]);

  


  const [locations, setLocations] = useState([]);
  const [openDevices, setOpenDevices] = useState({});
  const clientRef = useRef(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken"); // or wherever you store it
    if (token) {
      const payload = parseJwt(token);
      setUsername(payload?.username || null);
    }
  }, []);

  useEffect(() => {
    fetch("http://localhost:3000/locations")
      .then((res) => res.json())
      .then((json) => setLocations(json))
      .catch((err) => console.error("Error loading JSON:", err));
  }, []);

  const mqttSettings = {
    clientId: "test2",
    username: "mosquitto",
    password: "mosquitto123",
    keepalive: 1,
    clean: false,
    reconnectPeriod: 1000,
  };

  const updateValue = (DeviceID, key, value) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.Device.DeviceID === DeviceID
          ? { Device: { ...d.Device, [key]: value }, unverified: d.unverified, data: d.data }
          : d
      )
    );
  };

  const applyChanges = (device) => {
    console.log(device);
    clientRef.current.publish(device.DeviceID + "/Settings/Update", JSON.stringify(device));
  };

  const verifyDevice = (device) => {
    if (confirm(`Are you sure you want to verify device (${device.DeviceID})?`)) {
      fetch("http://localhost:3000/device", {
        method: "POST",
        body: JSON.stringify({ DeviceID: device.DeviceID }),
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: "Basic " + localStorage.getItem("authToken"),
        },
      }).then((res) => {
        if (res.status === 200) {
          setDevices((prev) =>
            prev.map((d) =>
              d.Device.DeviceID === device.DeviceID ? { Device: d.Device, unverified: false } : d
            )
          );
        }
      });
    }
  };

  const formatTemperature = (temp, isFahrenheit) =>
    isFahrenheit ? (temp * 9) / 5 + 32 : temp;

  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  useEffect(() => {
    const client = mqtt.connect("ws://192.168.1.131:8080", mqttSettings);
    clientRef.current = client;

    client.on("connect", () => {
      console.log("Connected to MQTT broker");
      client.connected &&
        client.publish("device/Online/request", "ping", {}, (err) =>
          err ? console.error("Publish error:", err) : console.log("Request sent")
        );
    });

    client.on("message", (topic, payload) => {
      const data = JSON.parse(payload.toString());

      if (topic === "device/Online") {
        fetch(`http://localhost:3000/device/verify?DeviceID=${data.DeviceID}`).then((res) => {
          const unverified = res.status !== 200;
          setDevices((prev) => {
            if (prev.some((d) => d.Device.DeviceID === data.DeviceID)) return prev;
            return [...prev, { Device: data, unverified }];
          });
        });
      }

      if (topic === "LightLevel") {
        setDevices((prev) =>
          prev.map((d) =>
            d.Device.DeviceID === data.DeviceID ? { ...d, data: { ...d.data, light: data } } : d
          )
        );
      }

      if (topic === "Temperature") {
        setDevices((prev) =>
          prev.map((d) =>
            d.Device.DeviceID === data.DeviceID ? { ...d, data: { ...d.data, temp: data } } : d
          )
        );
      }
    });

    client.on("error", (err) => console.error("MQTT error:", err));

    return () => client.end();
  }, []);


 const handleLogout = () => {
    localStorage.removeItem("authToken");
    clientRef?.current?.end?.(true);
    window.location.href = "/"
  };
  
  return (
    <div className="p-6">
      <div className="header dt-background">
        <h3>Hello {username}!</h3>
        <button onClick={handleLogout}>Logout</button>
      </div>


      <ul className="device-list">


        {devices.map((deviceEntry, i) => {
          const { Device, unverified, data } = deviceEntry;
          return (
            <li key={i}>
              <div className="device-card">
                <div>
                  <div className="device-header">
                    <h3>{Device.DeviceName}</h3>
                    <strong className="device-id">Device ID: {Device.DeviceID}</strong>
                  </div>
                  <div className="device-stats">
                      <div className="device-stats">
                        <WaterDropIcon style={{ color: "lightblue", height: 20 }} />
                        <strong>{data.temp.humidity}%</strong>
                      </div>
                      <div className="device-stats">
                        <LightModeIcon style={{ color: "yellow", height: 20 }} />
                        <strong>{data.light.lightlevel}</strong>
                      </div>
                   
                    
                      <div className="device-stats">
                        <DeviceThermostatIcon 
                          style={{ 
                            color: data.temp.temperature > 22 ? "red" : "lightgreen", 
                            height: 20 
                          }} 
                        />

                        <strong>
                          {formatTemperature(data.temp.temperature, Device.IsFahrenheit)}{" "}
                          {Device.IsFahrenheit ? "F" : "C"}&#176;
                        </strong>
                      </div>

                      
                  </div>
                </div>

                {!unverified && (
                  <div className="dropdown_button_conainer">
                    <button
                      className="dropdown_button"
                      onClick={() =>
                        setOpenDevices((prev) => ({
                          ...prev,
                          [Device.DeviceID]: !prev[Device.DeviceID],
                        }))
                      }
                    >
                      {openDevices[Device.DeviceID] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </button>
                  </div>
                )}
              </div>

              <form
                id={Device.DeviceID}
                className={`custom-form dt-background ${
                  unverified || openDevices[Device.DeviceID] ? "unfolded" : ""
                }`}
                onSubmit={(e) => {
                  e.preventDefault();
                  unverified ? verifyDevice(Device) : applyChanges(Device);
                }}
              >
                <div className="form-inner">
                  {unverified && (
                    <div className="form-group" style={{ textAlign: "left" }}>

                      <p >
                        <strong style={{color: "#d60015"}}>Device not activated!! </strong><br/> Activate the device to allow it to upload to the temperature data to the database.
                       
                      </p>
                      <input type="submit" value="Activate Device"/>
                    </div>
                  )}

                  {!unverified && (
                    <>
                      <div className="form-group">
                        <label htmlFor="location">Location</label>
                        <select
                          id="location"
                          value={Device.Location}
                          onChange={(e) => updateValue(Device.DeviceID, "Location", e.target.value)}
                        >
                          {locations.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="lightInterval">Light Interval</label>
                        <input
                          id="lightInterval"
                          type="number"
                          min={1}
                          value={Device.LightTime}
                          onChange={(e) => updateValue(Device.DeviceID, "LightTime", e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="temperatureInterval">Temperature Interval</label>
                        <input
                          id="temperatureInterval"
                          type="number"
                          min={1}
                          value={Device.TemperatureTime}
                          onChange={(e) =>
                            updateValue(Device.DeviceID, "TemperatureTime", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group checkbox-group">
                        <label htmlFor="fahrenheit">Fahrenheit</label>
                        <input
                          id="fahrenheit"
                          type="checkbox"
                          checked={Device.IsFahrenheit}
                          onChange={(e) =>
                            updateValue(Device.DeviceID, "IsFahrenheit", e.target.checked)
                          }
                        />
                      </div>

                      <div className="submit-container">
                        <input type="submit" value="Save" />
                      </div>
                    </>
                  )}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MainPage;
