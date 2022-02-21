var socket = new WebSocket("ws://192.168.178.97:5555")

document.addEventListener("keydown", event => {
	if (event.repeat)
		return

	if (event.key == "w") {
		socket.send("speed 1")
	} else if (event.key == "s") {
		socket.send("speed -1")
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
