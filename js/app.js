
const SUPABASE_URL="COLOCAR_URL";
const SUPABASE_KEY="COLOCAR_CHAVE";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const criterios=[
{name:"Ângulo da câmara inadequado", palavras:["ângulo","angulo","enquadramento","perspetiva","camera","câmara","plano"]},
{name:"Falta de storytelling", palavras:["storytelling","história","historia","narrativa","contexto","enredo"]},
{name:"Vídeo demasiado curto", palavras:["curto","breve","rapido","rápido","duração","duracao"]},
{name:"Só diz que o produto é bom", palavras:["genérico","generico","superficial","vago","só diz","so diz"]},
{name:"Não explica benefícios", palavras:["benefícios","beneficios","vantagens","não explica","nao explica","justifica"]},
{name:"Falta de edição", palavras:["edição","edicao","sem edição","sem edicao","transições","transicoes"]},
{name:"Planos estranhos", palavras:["planos estranhos","planos confusos","filmagem confusa","enquadramentos estranhos"]}
];

async function analisar(){
 const nome=document.getElementById("nome").value;
 const curso=document.getElementById("curso").value;
 const texto=document.getElementById("resposta").value.toLowerCase();

 let acertos=[];
 let falhas=[];

 criterios.forEach(c=>{
   const encontrou=c.palavras.some(p=>texto.includes(p.toLowerCase()));
   if(encontrou) acertos.push(c.name);
   else falhas.push(c.name);
 });

 const score=acertos.length;

 document.getElementById("resultado").innerHTML=`
 <h2>Resultado: ${score}/7</h2>
 <p><strong>Identificaste:</strong><br>${acertos.join("<br>")}</p>
 <p><strong>Poderias ter referido:</strong><br>${falhas.join("<br>")}</p>`;

 if(nome && curso){
  await client.from("respostas").insert({
   nome:nome,
   curso:curso,
   pontuacao:score,
   total_criterios:7
  });
 }
}
