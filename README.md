# Hasta capitulo 3

Git store todos los archivos que han sido toqueados como
`blob(space)filelength(null byte)(zlip file compressed)`

los ids de git los generate usando algoritmo sha1 sobre el contenido
de un archivo, asi es como generan los ids para que no
haya colissiones

todos los archivos toqueaados se guardan en `.git/objects/{idFirtTwoChars}/{idRestOfChars}`
donde se guarda en el formato especificado anteriormente

luego esta un archivo llamado **tree** que se guarda tambien en `.git/objects/{idFirstTwoChars}/{idRestOfChars}`
pero en vez de `blob` dice `tree` y su contenido es los archivos que
se tocaron (su filename) y su (id sha1) todo comprimido en formato zlip y un par de datos mas
por ejemplo

```
100644 blob ce013625030ba8dba906f756967f9e9ca394464a	helo.txt
100644 blob cc628ccd10742baea8241c5924df992b5c019f71	world.txt
```

luego cuando se hace el **commit** tambien se guarda el commit `.git/objects`
pero en vez de `blob` dice `commit` y su contenido es

```
tree id\n
author ${user_name} <${emai}> ${timestamp}\n
committer ${user_name} <${emai}> ${timestamp}\n
\n
commit message
```

timestamp tiene el format del output `strftime("%s %z")`

# capitulo 5

importante los `ls -l` para listar el file mode de los archivos
que son 2 bytes con el siguiente formato

XXXX XXX     XXX  XXX   XXX
-----------------------------
         permisions
1000 special user group other
file
type

special permission no lo uso en el codigo
(setuid, setgid and sticky bits)

luego los siguientes 12 bits son los que me importan

Octal |  Binary |  Permisions
-----------------------------
  0       000         none
  1       001         execute
  2       010         write
  3       011         write and execute
  4       100         read
  5       101         read and execute
  6       110         read and write
  7       111         all

para hacer un archivo excetuable
se hace `chmod +x file_name` que el +x
se interpreta como agrega el x (execute bit)

los directorios se guardan en el tree con el mode `040000`

se guardan los tree desde el inner most hast el upper most
porque un parent tree necesita el oid de su inner tree
y este solo se crea cuando se guarda un object

un object tree tiene esta estructura

```
$ git cat-file -p HEAD^{tree}

100644 blob 250a34d25ab7f9fe580adf868ebc450a07769be0	author.js
040000 tree 720230c017ef46963b921b45d634a2f92e0d4b42	bin
100644 blob 802c9244ee0da18f35f72e8a8347cfdd6f6e6b3f	blob.js
100644 blob 4dcefc33c7015722d6fd02a3f144e1d68611f734	commit.js
100644 blob 807b2fb0ff99d30f6edfc5a4e713a0c24bbce020	database.js
100644 blob 4f628085acce9a2659fdfb61655a0cc5151c4998	entry.js
100644 blob fb9b252ef9140a07ac5acd82d55fe9120275a216	lockfile.js
100644 blob 09ff4e59ea4a5f94cca9dda9c1fe270044a5f6ce	README.md
100644 blob 334ac91683d2c1f723fca3ca10e1a50fb60ed381	refs.js
100644 blob b0305be2dc89b0252629686b5a184b2de35eeb6b	tree.js
100644 blob 4e6e0b490de99e7f4be1a83d7da11ddbad8aaab9	workspace.js
```

**notar muy importante como se ordenan alfabeticamente los archivos**
fijarse que bin es un directorio pero igual respecta el orden

```
$git cat-file -p 720230c017ef46963b921b45d634a2f92e0d4b42

100755 blob 9b67fe9b052cfa97d7dcdc8dfac3660b7b51143f	jit
```

# capitulo 6

aun no anda nativamente `git ls-files` que es un commando
que te lista los archivos que estan el index (staged)

el index tiene la siguiente estructura

```
00000000  [44 49 52 43]("DIRC") [00 00 00 02](2=version index, siempre es 2)  [00 00 00 0c](cuantos archivos hay en el index, en este caso 12) (ahora se listan los archivos): 5d 54 6c c3(ctime)  |DIRC........]Tl.|
00000010  14 c1 f2 ab(ctime_nsec, puede ser todo 0000) 5d 54 6c c3(mtime)  14 29 5c aa(mtime_nsec) 00 00 b3 02(dev)  |....]Tl..)\.....|		00000010  00 00 00 00 5d 54 6c c3  00 00 00 00 00 00 b3 02  |....]Tl.........|
00000020  00 00 60 f8(ino) 00 00 81 ed(mode, exceutable or regular file, NO HAY DIRECTORIOS!)  
00 00 03 e8(uid) 00 00 03 e8(gid) |..`.............|		00000020  00 00 60 f8 00 00 81 ed  00 00 03 e8 00 00 03 e8  |..`.............|
00000030  00 00 0d 28(szie) [b2 b7 01 f8  ff db 66 c3 e1 76 e7 d8  |...(......f..v..|		00000030  00 00 0d 28 b2 b7 01 f8  ff db 66 c3 e1 76 e7 d8  |...(......f..v..|
00000040  a5 11 52 37 0e 01 44 62](oid, 20 bytes)  00 07(flags, tamanio del path name in bytes string) [62 69 6e 2f 6a 69  |..R7..Db..bin/ji|		00000040  a5 11 52 37 0e 01 44 62  00 07 62 69 6e 2f 6a 69  |..R7..Db..bin/ji|
00000050  74 00](nombre del archivo null terminated) [00 00](agregar tantos ceros hasta que este bloque de datos del este archiv sea multiple de 8) [comienza otro archivo...] 5d 50 a0 8b  05 ed b3 24 5d 4c c9 79  |t...]P.....$]L.y|		00000050  74 00 00 00
```

cada bloque de archvis se se multiple de 8
al final de todos los bloques de archivos se agegar un oid de todo los bloques
de los archivos + el header (44 49 52 43 00 00 00 02  00 00 00 0c) al final del index

**los archivos en el index deben estar ordenados alfabeticamente**

# Comandos utiles

`$git cat-file -p HEAD`
```
tree fc16b5915b7e980e4b8c17f5542b43da91d2ccb4
author martin ruiz <arcollector@gmail.com> 1565819726 -0300
committer martin ruiz <arcollector@gmail.com> 1565819726 -0300

```

`git cat-file -p HEAD^{tree}`
tira contenido del tree
```
040000 tree 1e48a1b85def8ec747745094b9239c594d73ea6d	bin
040000 tree 6895b581bb70dae6abda51af8665203619fef6d0	lib
100644 blob 9e2f70a26e4bf9b2d688a04c06ef833697472cdb	README.md

```

# Chapter 9

Ha sido un cancer un, deje en 14 de agosto y remote el
26 de octubre

Lo que haces, es un git status, la diferencia de
lo que esta en el index con lo que esta actualmente
en el directorio

compara index con directorio, un dolor de huevos,
el autor, a lo que esta en el directorio, le dice
**workspace**


# Chapter 16

Estoy devuelta con estas basura, 25 de diciembre,
es una mierda este libro, cada cambio que hago, por
mas pequenio que sea, me hace romper TODODODODDOPDO
el codigo actual, ODIOOO ESTA MIERDA!!!! NO SE PORQUE
MIERDA SIGO HACIENDO ESTE LIBRE DE RE MIERDA@!@!!!


Esto es importante
> git/HEAD points a the latest commit, and each commit
> points to its parent, if it has one. Every commit
> contains a pointer to a a tree, a complete snapshot
> of the project. Although we tend to think of commits
> as representing changes to the project, it's important
> to remember that they actually represent snapshots,
> and **and changes are inferred by comparing a commit's
> tree to that of its parent**


Chapter about reset, cherry-pick and revert I have ignore
them all just copy and pasting code, i am tired of this book!
