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

(* solution:q2:start *)
let classes_initiales a =
  let initial_est_final = List.mem a.initial a.finaux in
  Array.init (nb_etats a) (fun q ->
    if List.mem q a.finaux = initial_est_final then 0 else 1)
(* solution:q2:end *)

(* solution:q3:start *)
let signature a classes q =
  classes.(q)
  :: Array.to_list
       (Array.map (fun destination -> classes.(destination)) a.delta.(q))
(* solution:q3:end *)

(* solution:q4:start *)
let raffine a classes =
  let numeros = Hashtbl.create (nb_etats a) in
  let prochaine_classe = ref 0 in
  Array.init (nb_etats a) (fun q ->
    let s = signature a classes q in
    match Hashtbl.find_opt numeros s with
    | Some classe -> classe
    | None ->
        let classe = !prochaine_classe in
        Hashtbl.add numeros s classe;
        incr prochaine_classe;
        classe)
(* solution:q4:end *)

(* solution:q5:start *)
let classes_equivalence a =
  let rec jusquau_point_fixe classes =
    let nouvelles_classes = raffine a classes in
    if nouvelles_classes = classes then classes
    else jusquau_point_fixe nouvelles_classes
  in
  jusquau_point_fixe (classes_initiales a)
(* solution:q5:end *)

(* solution:q6:start *)
let quotient a classes =
  let nombre_classes = 1 + Array.fold_left max (-1) classes in
  let representants = Array.make nombre_classes (-1) in
  Array.iteri (fun q classe -> representants.(classe) <- q) classes;
  let delta =
    Array.init nombre_classes (fun classe ->
      let q = representants.(classe) in
      Array.map (fun destination -> classes.(destination)) a.delta.(q))
  in
  {
    initial = classes.(a.initial);
    finaux = List.sort_uniq Int.compare (List.map (fun q -> classes.(q)) a.finaux);
    delta;
  }
(* solution:q6:end *)

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

(* solution:q7:start *)
let minimiser a =
  quotient a (classes_equivalence a)

let () =
  let minimal = minimiser redondant in
  assert (nb_etats minimal = 5);
  assert (equivalent_jusqua redondant minimal 12)
(* solution:q7:end *)
