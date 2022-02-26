var socket = new WebSocket("ws://192.168.178.97:5555")

var speed = 0.4

socket.onopen = event => {
	document.addEventListener("keydown", event => {
		if (event.repeat)
			return

		if (event.key == "w") {
			socket.send("speed " + speed.toString())
		} else if (event.key == "s") {
			socket.send("speed " + (-speed).toString())
		} else if (event.key == "a") {
			socket.send("direction l")
		} else if (event.key == "d") {
			socket.send("direction r")
		}
	})

	document.addEventListener("keyup", event => {
		if (event.key == "w") {
			socket.send("speed 0")
		} else if (event.key == "s") {
			socket.send("speed 0")
		} else if (event.key == "a") {
			socket.send("direction n")
		} else if (event.key == "d") {
			socket.send("direction n")
		}
	})
	$('#status-txt').toggleClass(['error-txt', 'confirm-txt']).html("Connected!")
}

socket.onmessage = msg => {
	var content = msg.data.slice(msg.data.indexOf(" ") + 1)
	var command = msg.data.slice(0, msg.data.indexOf(" "))
	switch (command) {
		case "occupancy_grid":
			render_occupancy_grid(JSON.parse(content))
			break
        default:
            console.log("wrong command")
	}
}

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
			var g = Math.floor(grid.data[y * grid.info.width + x] * 2.5)
			if (g < 0) g = 0
			ctx.fillStyle = `rgb(${g}, ${g}, ${g})`
			ctx.fillRect(x * scale, y * scale, scale, scale)
		}
	}
}
