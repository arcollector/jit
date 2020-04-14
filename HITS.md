rm -rf .git ; 
jit init ; 
echo 'first' > a.txt ; 
jit add a.txt ; 
echo first | jit commit ;

echo 'second' > b.txt ;
 jit add a.txt ; 
echo second | jit commit ;
