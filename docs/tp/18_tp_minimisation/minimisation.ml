type afdc = {
  initial : int;
  finaux : int list;
  delta : int array array;
}

let nb_etats a = Array.length a.delta

let nb_lettres a = Array.length a.delta.(0)

let delta_etoile a q mot =
  List.fold_left (fun etat lettre -> a.delta.(etat).(lettre)) q mot

let accepte a mot =
  List.mem (delta_etoile a a.initial mot) a.finaux

(* L'état [2 * r + p] mémorise le reste [r] modulo 5 et la parité [p]
   du nombre de chiffres 1 lus. *)
let redondant =
  let transition q chiffre =
    let r = q / 2 in
    let p = q mod 2 in
    2 * ((2 * r + chiffre) mod 5) + ((p + chiffre) mod 2)
  in
  {
    initial = 0;
    finaux = [0; 1];
    delta = Array.init 10 (fun q -> Array.init 2 (transition q));
  }

(* Question 2 *)
let classes_initiales _a =
  failwith "À compléter"

let () =
  assert (classes_initiales redondant = [|0; 0; 1; 1; 1; 1; 1; 1; 1; 1|])

(* Question 3 *)
let signature _a _classes _q =
  failwith "À compléter"

let () =
  let initiales = classes_initiales redondant in
  assert (signature redondant initiales 0 = [0; 0; 1]);
  assert (signature redondant initiales 2 = [1; 1; 1])

(* Question 4 *)
let raffine _a _classes =
  failwith "À compléter"

let () =
  let p0 = classes_initiales redondant in
  let p1 = raffine redondant p0 in
  assert (p1 = [|0; 0; 1; 1; 2; 2; 1; 1; 1; 1|]);
  assert (raffine redondant p1 = [|0; 0; 1; 1; 2; 2; 3; 3; 4; 4|])

(* Question 5 *)
let classes_equivalence _a =
  failwith "À compléter"

let () =
  assert (classes_equivalence redondant = [|0; 0; 1; 1; 2; 2; 3; 3; 4; 4|])

(* Question 6 *)
let quotient _a _classes =
  failwith "À compléter"

let () =
  let classes = classes_equivalence redondant in
  let minimal = quotient redondant classes in
  assert (nb_etats minimal = 5);
  assert (minimal.initial = 0);
  assert (minimal.finaux = [0])

let rec mots_de_taille alphabet n =
  if n = 0 then [[]]
  else
    List.concat_map
      (fun mot -> List.init alphabet (fun lettre -> lettre :: mot))
      (mots_de_taille alphabet (n - 1))

let mots_jusqua alphabet n =
  List.concat_map (mots_de_taille alphabet) (List.init (n + 1) Fun.id)

let equivalent_jusqua a b n =
  List.for_all
    (fun mot -> accepte a mot = accepte b mot)
    (mots_jusqua (nb_lettres a) n)

(* Question 7 *)
let minimiser _a =
  failwith "À compléter"

let () =
  let minimal = minimiser redondant in
  assert (nb_etats minimal = 5);
  assert (equivalent_jusqua redondant minimal 12);
  print_endline "Tous les tests sont passés."
