{
  description = "Development environment for the MPI Informatique website";

  inputs.environnement.url = "github:mpi-informatique/tp-environnement";
  inputs.nixpkgs.follows = "environnement/nixpkgs";

  outputs = { nixpkgs, environnement, ... }:
    let
      systems = environnement.lib.systems;
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = environnement.legacyPackages.${system}.pkgs;
        in
        {
          default = environnement.lib.mkShell system {
            packages = [ pkgs.nodejs_22 ];
          };
        });
    };
}
