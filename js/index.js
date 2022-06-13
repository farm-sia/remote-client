//var socket = new WebSocket("ws://192.168.178.97:5555")
//var socket = new WebSocket("ws://172.20.26.206:5555")
//var socket = new WebSocket("ws://localhost:5555")
var socket = new WebSocket("ws://192.168.12.34:5555") // erstellt einen Websocket zu der IP 192.168.12.34 auf dem Port 5555 => Verbindung zum Server

var speed = .3 // gibt die Geschwindigkeit an, mit der der Roboter fährt. Anfangs auf 0.3 (30%) und kann mit Slider verändert werden

var last_pose // variable zum speichern der letzten position die der Client von dem Server erhalten hat
var last_map_info // ähnlich wie last_pose, speichert aber die letzte karte

function send(packet, content) { // kleine Helferfunktion um Packete über den WebSocket zu verschicken
	content["packet"] = packet;
	socket.send(JSON.stringify(content))
}

socket.onopen = event => { // Eventlistener, der jedes mal dann ausgeführt wird, wenn die Verbindung des WebSockets, also zum Server, aufgebaut wurde
	document.addEventListener("keydown", event => { // es wird ein Eventlistener auf Tastendrücke erstellt. Diese anonyme Funktion wird bei jedem Tastendruck aufgerufen
		if (event.repeat) // falls der Tastendruck kein neuer ist, sondern nur eine Taste gehalten wird, abbrechen
			return
		
		if (event.key == "w") { // wenn die gedrückte Taste ein w, s, a oder d ist, wird entsprechend die soll-Geschwindigkeit, bzw soll-Richtung auf entweder die eingestellte Geschwindigkeit oder auf l bzw r gesetzt
			key_speed = speed
		} else if (event.key == "s") {
			key_speed = -speed
		} else if (event.key == "a") {
			key_direction = 'l'
		} else if (event.key == "d") {
			key_direction = 'r'
		}
		update_direction_by_keys() // es wird die Funktion aufgerufen, die aus der soll-Richtung und soll-Geschwindigkeit Befehle generiert und diese an den Raspi schickt
	})

	document.addEventListener("keyup", event => { // dasselbe wie oben mit dem keydown Event, nur dass hier auf das Loslassen der Tasten reagiert wird und somit die soll-Geschwindigkeit und soll-Richtung auf neutral gestellt werden
		if (event.key == "w") {
			key_speed = 0
		} else if (event.key == "s") {
			key_speed = 0
		} else if (event.key == "a") {
			key_direction = 'n'
		} else if (event.key == "d") {
			key_direction = 'n'
		}
		update_direction_by_keys()
	})
	$('#status-txt').toggleClass(['error-txt', 'confirm-txt']).html("Connected!") // dies Farbe des Statustextes wird von Rot auf Grün gesetzt und dessen Nachricht enthält nun "Connected!"
}

// speichern soll-Geschwindigkeit und soll-Richtung
var key_direction = 'n'
var key_speed = 0

function update_direction_by_keys() { // Funktion, die aus soll-Richtung und soll-Geschwindigkeit Bewegungsbefehle generiert und diese dem Raspi schickt
	// speed_l und speed_r enthalten die Geschwindigkeit der individuellen linken und rechten Motoren. Diese werden anfangs 
	var speed_l = key_speed
	var speed_r = key_speed
	
	if (key_direction == 'r') { // Wenn soll-Richtung rechts ist, dann die Geschwindigkeit des rechten Rads halbieren
		speed_r *= 0.5
	} else if (key_direction == 'l') { // dasselbe für das linke Rad
		speed_l *= 0.5
	}	
	send("steering", {"r": speed_r, "l": speed_l}) // ein Packet names steering mit den einzelnen Rad Geschwindigkeiten an den Server senden
}

socket.onmessage = msg => { // ein Eventlistener für das Eintreffen einer Nachricht über den WebSocket
	msg = JSON.parse(msg.data) // Nachricht in ein gültiges JavaScript Object parsen
	switch (msg.packet) { // ein Switch Statement um die unterschiedlichen Typen von Paketen zu unterscheiden
		case "ros_map":
			render_occupancy_grid(msg)
			break
		case "ros_pose":
			last_pose = msg.pose
			break
		case "ros_vel":
			handle_vel_cmd(msg)
			break
		case "goal_reached": // wenn das Ziel erreicht wurde oder die Aufgabe fehlgeschlagen ist, wird die 
		case "goal_failed":
			send("steering", {"speed": 0})
			break
        default:
            console.log("wrong command")
	}
}

function speedChange() { // eine Funktion die bei jeder Änderung des Geschwindigkeits Sliders ausgeführt wird. Sie setzt die Einstellgeschwindigkeit auf einen Wert von 0 - 1, abhänigig von der Position des Sliders
	speed = $('#speed-range').val() / 100
}

function handle_vel_cmd(msg) {
	console.log(msg)
	if (msg.angular.z > 0) {
		send("steering", {"r": 0.3, "l": -0.3})
	} else if (msg.angular.z < 0) {
		send("steering", {"l": 0.3, "r": -0.3})
	} else {
		send("steering", {"l": msg.linear.x, "r": msg.linear.x})
	}
}

var nav_img = new Image // Laden des Icons, das auf der Karte den Roboter repräsentiert
nav_img.src = 'imgs/icons8-gps-gerät-96.png'

function render_occupancy_grid(grid) {
	var c = $("#map-canvas") // Speichern des HTML Elements auf das gezeichnet werden soll, sowie dessen Dimensionen in Variablen
	var c_width = c.width()
	var c_height = c.height()
	var ctx = c[0].getContext("2d")

	ctx.clearRect(0, 0, c_width, c_height) // Löschen des Inhalts der Leinwand (Canvas)

	// das Bestimmen der Auflösung mit der die Karte auf die Canvas gezeichnet werden soll. Ist die generierte Karte höher als breit, wird die Höhe als Maßgebende Skala festgelegt,
	// ist die Karte breiter als hoch, wird die Breite benutzt. Dies geschieht, um die Karte auf der UI in einem Ramen zu halten
	var scale
	if (grid.info.width > grid.info.height)
		scale = c_width / grid.info.width
	else
		scale = c_height / grid.info.height
	last_map_info = grid.info // speichern der Karten-Nachricht als letzte Nachricht
	last_map_info.scale = scale // speichern der Skala dieser letzten Karte

	for (var y = 0; y < grid.info.height; y++) { // mit zwei For-Schleifen durch alle Zellen der Karte durchgehen
		for (var x = 0; x < grid.info.width; x++) {
			var val = grid.data[y * grid.info.width + x] // speichern des Wertes an der aktuellen Stelle in der Variable val
			var g = 255 - val // val wird invertiert und in g gespeichert
			if (val < 0) g = 0
			ctx.fillStyle = `rgb(${g}, ${g}, ${g})` // erstellen eines Farbtons aus dem Wert von g
			ctx.fillRect(x * scale, c_height - (y * scale), scale, scale) // an der entsprechenden Stelle ein Rechteck mit entsprechender Farbe
		}
	}
	if (!last_pose) { // falls bisher keine Informationen über die Position des Roboters erhalten wurden, aus der Funktion ausbrechen
		console.error("last pose not yet received, not drawing position")
		return
	}
	
	// Berechnen der Position des Icons auf dem Bildschirm, so dass es die Position des Roboters wiedergibt
	var icon_x = (((last_pose.position.x - grid.info.origin.position.x) / grid.info.resolution) * scale) - 10
	var icon_y = (((last_pose.position.y - grid.info.origin.position.y) / grid.info.resolution) * scale) - 10
	// Berechnen der Rotation des Icons
	var angle_to_rotate = (-quat_to_euler(last_pose.orientation).yaw + (1/2) * Math.PI) % (2*Math.PI)
	
	ctx.save() // speichern der aktuellen Ausrichtung der Canvas
	ctx.translate(icon_x, c_height-icon_y) // Bewegen und Rotieren der Canvas um das Icon
	ctx.rotate(angle_to_rotate)
	ctx.translate(-10, -10) // Bewegen der Canvas um 10 Pixel in X und Y Richtung, so da das Icon 20x20 Pixel groß ist und in der Mitte der eigentlichen Position gezeichnet werden soll

	ctx.drawImage(nav_img, 0, 0, 20, 20) // Zeichnen des Icons

	ctx.restore() // Wiederherstellen der oben gespeicherten Position der Canvas
}

function quat_to_euler(q) { // Funktion um Quaternions in Euler Vektoren umzuwandeln
	var euler = {
		roll: 0,
		pitch: 0,
		yaw: 0
	}
	// roll (x-axis rotation)
	var sinr_cosp = 2 * (q.w * q.x + q.y * q.z)
	var cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y)
	euler.roll = Math.atan2(sinr_cosp, cosr_cosp)

	// pitch (y-axis rotation)
	var sinp = 2 * (q.w * q.y - q.z * q.x)
	if (Math.abs(sinp) >= 1)
		euler.pitch = Math.copysign(M_PI / 2, sinp); // use 90 degrees if out of range
	else
		euler.pitch = Math.asin(sinp)

	// yaw (z-axis rotation)
	var siny_cosp = 2 * (q.w * q.z + q.x * q.y)
	var  cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z)
	euler.yaw = Math.atan2(siny_cosp, cosy_cosp)

	return euler
}

window.onload = () => { // Wird ausgeführt, wenn alle HTML Elemente fertig geladen haben
	$("#map-canvas").click(e => { // fügt einen Eventlistener auf die Karte hinzu, der bei jedem Klick darauf ausgeführt wird
		var c = $("#map-canvas")
		mouseX = e.pageX - c.offset().left // die Position des Klicks auf der Karte wird gespeichert
    	mouseY = e.pageY - c.offset().top
		var height = c.height()
		var width = c.width()
		
		// die Position des Klicks wird in Meter umgerechnet
		var real_x = (mouseX / last_map_info.scale) * last_map_info.resolution + last_map_info.origin.position.x
		var real_y = ((height-mouseY) / last_map_info.scale) * last_map_info.resolution + last_map_info.origin.position.y
		send("set_goal", {x: real_x, y: real_y}) // es wird das Ziel an den Server gesendet
	})
}


