{
  description = "Local Python development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";

      pkgs = import nixpkgs {
        inherit system;
      };

      pythonEnv = pkgs.python3.withPackages (pythonPackages: with pythonPackages; [
        # Don't forget to add python packages here
        websockets
      ]);
      venvDir = "Scripts/PythonEnv";

    in {
      devShells.${system}.default = pkgs.mkShell {
        name = "widget-server-env";

        packages = [
          pythonEnv
        ];

        shellHook = ''
          if [ -d "${venvDir}" ]; then
            echo "venv '${venvDir}' ready"
          else
            echo "Creating Python venv"
            python3 -m venv "${venvDir}"
          fi
          source "${venvDir}/bin/activate"
          python -m pip install -r requirements.txt
          echo "Python widget server environment"
          echo "Run: python3 server.py"

          export PYTHONPATH="$PWD"
        '';
      };
    };
}
