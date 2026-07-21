import asyncio
import json
import subprocess
import websockets


async def handler(websocket):
  async for message in websocket:

    data = json.loads(message)

    command = data.get("command")

    if not command:
      continue

    try:

      process = await asyncio.create_subprocess_exec(
          "bash",
          "-lc",
          command,
          stdout=subprocess.PIPE,
          stderr=subprocess.STDOUT
      )

      while True:
        line = await process.stdout.readline()

        if not line:
          break

        await websocket.send(
          line.decode(errors="replace")
        )

      await websocket.send(
        "\n[process exited]\n"
      )

    except Exception as e:
      await websocket.send(
        f"\nERROR: {e}\n"
      )


async def main():
  async with websockets.serve(
    handler,
    "localhost",
    8766
  ):
    print("Terminal server running")
    await asyncio.Future()


asyncio.run(main())
