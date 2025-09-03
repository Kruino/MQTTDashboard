import { useState, useEffect, useRef, useNavigate } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LightModeIcon from "@mui/icons-material/LightMode";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';

import "../App.css";

function MainPage() {
  const [devices, setDevices] = useState([]);

  const [locations, setLocations] = useState([]);
  const [openDevices, setOpenDevices] = useState({});

  const clientRef = useRef(null);

  

  //Get all location when opening page.
  useEffect(() => {
    fetch("http://192.168.1.131:3000/locations")
      .then((res) => res.json())
      .then((json) => setLocations(json))
      .catch((err) => console.error("Error loading JSON:", err));
  }, []);


  //Updates value in usestate when user input changes it.
  const updateValue = (DeviceID, key, value) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.Device.DeviceID === DeviceID
          ? { Device: { ...d.Device, [key]: value }, unverified: d.unverified, data: d.data }
          : d
      )
    );
  };

  //Sends updated settings to device
  const applyChanges = (device) => {
    console.log(device);
    const json = JSON.stringify({
      Topic: device.DeviceID + "/Settings/Update",
      Msg: device
    });

    console.log(json);
    clientRef.current.send(json);
  };

  //Authorizes a device
  const verifyDevice = (device) => {
    if (confirm(`Are you sure you want to verify device (${device.DeviceID})?`)) {
      fetch("http://192.168.1.131:3000/device", {
        method: "POST",
        body: JSON.stringify({ DeviceID: device.DeviceID, LocationID: device.Location }),
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
          const json = JSON.stringify({
            Topic: device.DeviceID + "/Device/Verified",
            Msg: "ping"
          });

          clientRef.current.send(json);
        }
      });
    }
  };

  //Unauthorizes a device
  const unverifyDevice = (device) => {
    if (confirm(`Are you sure you want to unverify device (${device.DeviceID})?`)) {
      fetch("http://192.168.1.131:3000/device/unverify", {
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
              d.Device.DeviceID === device.DeviceID ? { Device: d.Device, unverified: true } : d
            )
          );
          const json = JSON.stringify({
            Topic: device.DeviceID + "/Device/Unverified",
            Msg: "ping"
          });

          clientRef.current.send(json);
        }
      });
    }
  };

  //Creates a new location
  const createLocation = async () => {
    var input = document.getElementById("Location-Name");
    if(input.value == null || input.value == "")
      return;

    if (confirm(`Are you sure you want to create location (${input.value})?`)) {
      fetch("http://192.168.1.131:3000/locations", {
        method: "POST",
        body: JSON.stringify({ name: input.value }),
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: "Basic " + localStorage.getItem("authToken"),
        },
      }).then((res) => {

        if(res.status != 200){
          res.json().then((json) => confirm(json.error))
        }else{
          confirm("Location created!");
        }
      });
    }

  };
  //Converts a HEX value to something more digestible for a M5Go LCD
  const hexToRGB565 = (hex) => {
    // Remove the leading #
    hex = hex.replace(/^#/, '');

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Convert to 16-bit RGB565
    let rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);

    // Return as hex string (0xXXXX format)
    return "0x" + rgb565.toString(16).padStart(4, "0").toUpperCase();
  }

  //Converts a rgb value to hex for the interface
const rgb565ToHex = (rgb565) =>  {
  const r = ((rgb565 >> 11) & 0x1F) << 3;
  const g = ((rgb565 >> 5) & 0x3F) << 2;
  const b = (rgb565 & 0x1F) << 3;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

//formats temperature based on if the devices is set to fahrenheit or celsius.
const formatTemperature = (temp, isFahrenheit) =>
    isFahrenheit ? (temp * 9) / 5 + 32 : temp;

  useEffect(() => {
    document.title = 'Dashboard';
  }, []);

  //connects to websocket.
useEffect(() => {
  const token = localStorage.getItem("authToken"); // JWT from login
  const ws = new WebSocket(`ws://192.168.1.131:3000?token=${token}`);
  clientRef.current = ws;

  ws.onopen = () => {
    console.log("Connected to WS server");
    //When connected to websocket at first. Ping devices to send update request.
    ws.send('{"Topic": "device/Update/request", "Msg": "ping"}')
  };

  ws.onmessage = (event) => {
    const { topic, message } = JSON.parse(event.data);

    console.log("WS message:", topic, message);

    // // Handle different topics
if (topic === "device/Update") {

  fetch(`http://192.168.1.131:3000/device/verify`, {
    method: "POST",
    body: JSON.stringify({ DeviceID: message.DeviceID }),
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: "Basic " + localStorage.getItem("authToken"),
    },
  }).then(async (res) => {
    const unverified = res.status !== 200;

    setDevices((prev) => {
      let exists = false;

      const updated = prev.map((d) => {
        if (d.Device.DeviceID === message.DeviceID) {
          exists = true;
          return {
            Device: {
              ...d.Device, // keep existing fields
              data: message.data, // update the data field
            },
            unverified,
          }; 
        }
        return d;
      });

      // if not found, add new
      if (!exists) {
        updated.push({ Device: message, unverified });
      }

      return updated;
    }, []);
  });
}
  };

  ws.onerror = (err) => console.error("WS error:", err);
  ws.onclose = () => console.log("WS closed");

  return () => ws.close();
}, []);



  return (
    <div className="p-6">



      <div>
        <div className="device-list" style={{marginTop: 5, alignSelf: "center"}}>
            <form className="device-card"  onSubmit={(e) => {
              e.preventDefault();

              createLocation()
            }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 25}} >
              <label htmlFor="nameInput">Location Name</label>
              <input id="Location-Name" key={"locationName"}/>

              <input type="submit" value="Create location"/>
            </form>
        </div>


      <ul className="device-list">


        {devices.map((deviceEntry, i) => {
          const { Device, unverified } = deviceEntry;
          return (
            <li key={i}>
              <div className="device-card">
                <div>
                  <div className="device-header">
                    <button onClick={() => {
                        const json = JSON.stringify({
                          Topic: Device.DeviceID + "/Device/Restart",
                          Msg: "ping"
                        });
                      clientRef.current.send(json)
                    }} style={{padding: 5, background: "#ebb734"}}><RestartAltIcon /></button>
                         <button onClick={() => {
                        unverifyDevice(Device);
                    }} style={{padding: 5, background: "#a60707"}}><RemoveModeratorIcon /></button>
                    <h3>{Device.DeviceName}</h3>
                    <strong className="device-id">Device ID: {Device.DeviceID}</strong>
                  </div>
                  
                  <div className="device-stats">
                      <div className="device-stats">
                        <WaterDropIcon style={{ color: "lightblue", height: 20 }} />
                        <strong>{Device.data.Humidity.toFixed(2) }%</strong>
                      </div>
                      <div className="device-stats">
                        <LightModeIcon style={{ color: "yellow", height: 20 }} />
                        <strong>{Device.data.LightLevel}</strong>
                      </div>
                   
                    
                      <div className="device-stats">
                        <DeviceThermostatIcon 
                          style={{ 
                            color: Device.data.Temperature > 22 ? "red" : "lightgreen", 
                            height: 20 
                          }} 
                        />

                        <strong>
                          {formatTemperature(Device.data.Temperature , Device.IsFahrenheit).toFixed(2)}{" "}
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
                        <strong style={{color: "#d60015"}}>Device Not Activated! </strong><br/>Activate your device to enable database access.
                       
                      </p>
                      <input type="submit" value="Activate Device"/>
                    </div>
                  )}

                  {!unverified && (
                    <>


                      <div className="form-group">
                        <label htmlFor="nameInput">Name</label>
                        <input
                          id="nameInput"
                          type="text"
                          min={1}
                          value={Device.DeviceName}
                          onChange={(e) => updateValue(Device.DeviceID, "DeviceName", e.target.value)}
                        />
                      </div>

                      <div className="form-group checkbox-group">
                        <label htmlFor="uiColor">Interface Color</label>
                        <input
                          id="uiColor"
                          type="color"
                          value={rgb565ToHex(Device.DisplayColor)} // convert decimal to #RRGGBB
                          onChange={(e) => updateValue(
                            Device.DeviceID,
                            "DisplayColor",
                            hexToRGB565(e.target.value) // convert #RRGGBB → RGB565 decimal
                          )}
                        />

                      </div>

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
                        <label htmlFor="lightInterval">Light Upload Interval (Min)</label>
                        <input
                          id="lightInterval"
                          type="number"
                          min={1}
                          value={Device.LightTime}
                          onChange={(e) => updateValue(Device.DeviceID, "LightTime", e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="temperatureInterval">Temperature Upload Interval (Min)</label>
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
                        <input type="submit" value="Apply" />
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
    </div>
  );
}

export default MainPage;
