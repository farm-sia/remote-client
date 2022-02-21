var socket = new WebSocket("ws://localhost:5555")

socket.onopen = event => {
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
	$('#status-txt').toggleClass(['error-txt', 'confirm-txt']).html("Connected!")
}

