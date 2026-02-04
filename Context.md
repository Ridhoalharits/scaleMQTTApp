Electronic Weighing System (EWS).EWS is a system to measure the weight if material that based on next js website


EWS <-> MQTT Broker <-> Rust TCP Bridge <-> Scale (RS232/RS485)

on the site there is many vendors of the scale like mettler toledo, avery, etc. i need to make a system that can read the weight from the scale and send it to the EWS via MQTT. i need to make the tcp bridge to be able to read the weight from the scale and send it to the EWS via MQTT with various format of the scale. i want a universal response format so it will be easy to integrate with the EWS. some scale need to send command to start streaming the get weight data and some scale with continuous streaming. for the set to zero, tare and get serial number, i neaed to send command to the scale once and wait the scale to respnse. to get the weight data, i need to send command to the scale from ews. i need your reccomendation to make this system.

1. EWS will sending get data command everytime to get the weight data from the scale. so the tcp bridge need to be able to send command to the scale and wait the scale to respnse. and then send the weight data to the EWS via MQTT.
2. EWS send once and the tcp will continuous streaming the weight data from the scale to the EWS via MQTT.

which works better?

for the second option, if receive command set to zero and tare and get serial number, it only trigger once. please provide the best way to handle this in readme or notes so i can asses it

also every scale have their own way to trigger. there is some scale that using SI, I4, etc. some scale is using the \x00-\x1F\x7F-\x9F kind of. so the tcp bridge need to be able to handle various format of the scale. i want a universal response format so it will be easy to integrate with the EWS.

