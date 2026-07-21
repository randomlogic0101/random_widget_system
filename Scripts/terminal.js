let socket;


function connect()
{
    socket = new WebSocket(
        "ws://localhost:8766"
    );


    socket.onmessage = function(event)
{
    console.log("[terminal]", event.data);


    let output =
        document.getElementById("output");

    output.textContent += event.data;

    output.scrollTop =
        output.scrollHeight;
};




    socket.onclose = function()
    {
        setTimeout(connect, 2000);
    };
}



document
.getElementById("run")
.onclick = function()
{
    let command =
        document.getElementById("command").value;


    socket.send(JSON.stringify({
        command: command
    }));

};



connect();
