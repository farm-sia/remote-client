var socket = new WebSocket("ws://192.168.178.97:5555")
//var socket = new WebSocket("ws://172.20.26.52:5555")
//var socket = new WebSocket("ws://localhost:5555")

var speed = .3

var last_pose

function send(packet, content) {
	content["packet"] = packet;
	socket.send(JSON.stringify(content))
}

socket.onopen = event => {
	document.addEventListener("keydown", event => {
		if (event.repeat)
			return

		if (event.key == "w") {
			send("steering", {"speed": speed})
		} else if (event.key == "s") {
			send("steering", {"speed": -speed})
		} else if (event.key == "a") {
			send("steering", {"direction": 'l'})
		} else if (event.key == "d") {
			send("steering", {"direction": 'r'})
		}
	})

	document.addEventListener("keyup", event => {
		if (event.key == "w") {
			send("steering", {"speed": 0})
		} else if (event.key == "s") {
			send("steering", {"speed": 0})
		} else if (event.key == "a") {
			send("steering", {"direction": 'n'})
		} else if (event.key == "d") {
			send("steering", {"direction": 'n'})
		}
	})
	$('#status-txt').toggleClass(['error-txt', 'confirm-txt']).html("Connected!")
}

socket.onmessage = msg => {
	msg = JSON.parse(msg.data)
	switch (msg.packet) {
		case "ros_map":
			render_occupancy_grid(msg)
			break
		case "ros_pose":
			last_pose = msg.pose
			break
        default:
            console.log("wrong command")
	}
}

function speedChange() {
	speed = $('#speed-range').val() / 100
	console.log(speed)
}

var nav_img = new Image
nav_img.src = 'imgs/icons8-gps-gerät-96.png'

function render_occupancy_grid(grid) {
	var c = $("#map-canvas")
	var c_width = c.width()
	var c_height = c.height()

	var ctx = c[0].getContext("2d")
	ctx.clearRect(0, 0, c_width, c_height)

	var scale;
	if (grid.info.width > grid.info.height)
		scale = c_width / grid.info.width
	else
		scale = c_height / grid.info.height
	
	for (var y = 0; y < grid.info.height; y++) {
		for (var x = 0; x < grid.info.width; x++) {
			var val = grid.data[y * grid.info.width + x]
			var g = 255 - val
			if (val < 0) g = 0
			ctx.fillStyle = `rgb(${g}, ${g}, ${g})`
			ctx.fillRect(x * scale, c_height - (y * scale), scale, scale)
		}
	}
	console.log(grid.info.origin.position)
	if (!last_pose) {
		console.error("last pose not yet received, not drawing position")
		return
	}

	var icon_x = (((last_pose.position.x - grid.info.origin.position.x) / grid.info.resolution) * scale) - 10
	var icon_y = (((last_pose.position.y - grid.info.origin.position.y) / grid.info.resolution) * scale) - 10
	var angle_to_rotate = (-quat_to_euler(last_pose.orientation).yaw + (1/2) * Math.PI) % (2*Math.PI)
	
	ctx.save()
	ctx.translate(icon_x, c_height-icon_y)
	ctx.rotate(angle_to_rotate)
	ctx.translate(-10, -10)

	ctx.drawImage(nav_img, 0, 0, 20, 20)

	ctx.restore()
}

function quat_to_euler(q) {
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
