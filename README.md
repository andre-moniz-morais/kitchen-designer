# Planeador da Casa

Aplicação web para planear uma casa inteira (ou só a cozinha) numa planta 2D, vista de cima como numa planta de arquitetura, e vê-la em 3D com um clique.

## Funcionalidades

- **Planta da divisão com medidas reais** — retângulo ou forma em L com as medidas exatas, ou desenho livre canto a canto, com snap à grelha, bloqueio horizontal/vertical, guias de alinhamento e introdução do comprimento exato de cada parede (escreva o número e escolha a direção com as setas).
- **Edição da planta** — arraste cantos e paredes, crie novos cantos, edite o comprimento de cada parede, pé-direito e espessura das paredes, portas, janelas e vãos.
- **Paredes interiores** — desenhe paredes a partir de qualquer ponto de outra parede (dentro ou fora do contorno), em cadeia, com medidas exatas. As pontas ligadas acompanham-se ao arrastar; cada parede tem espessura e altura próprias (meias paredes e muros) e pode ter portas e janelas.
- **Divisões** — etiquetas de cozinha, sala, quarto, casa de banho, escritório, despensa, lavandaria, garagem, ginásio, hall e escadas. A aplicação deteta o espaço fechado por paredes à volta da etiqueta, mostra a área e aplica o pavimento escolhido para essa divisão.
- **Catálogo para toda a casa** — filtros por divisão. Sala: sofás (incl. de canto), poltrona, mesas de centro e de apoio, móvel de TV e televisão, estante, aparador, lareira. Quarto: camas, berço, mesas de cabeceira, roupeiros, cómoda. Casa de banho: sanita, bidé, móveis de lavatório, lavatório suspenso, bases de duche, banheira, toalheiro, espelho, coluna. Escritório, despensa e lavandaria, garagem (automóvel, bicicleta, bancada), ginásio (passadeira, bicicleta estática, banco, halteres, estrutura de musculação) e escadas (reta, em L e de caracol), além de tapetes, plantas, candeeiros e radiadores.
- **Cozinha** — móveis base, gaveteiros, móveis de parede, móveis suspensos do teto, colunas (despenseiro, forno + micro-ondas, frigorífico integrado), ilha, tampos, frigoríficos (combinado, americano), congelador, arca, forno, micro-ondas, placas de indução e gás, fogão, exaustores de parede e de ilha, lava-loiça, máquinas de lavar loiça e roupa, máquina de secar, garrafeira, mesa, cadeiras, bancos e candeeiros.
- **Posicionamento flexível** — os móveis encostam e rodam automaticamente para a parede e alinham com os vizinhos. Cada elemento tem largura, profundidade, altura, distância ao chão, distância ao teto e distância ao elemento por baixo (ex.: móvel suspenso a 100 cm acima da ilha; micro-ondas por cima do forno com “Sobre o de baixo”).
- **Mais de 90 materiais** — madeiras, mármores, granitos, quartzos, betão, terrazzo, lacados, metais, tecidos e peles, e pavimentos, gerados proceduralmente (sem ficheiros externos). “Aplicar a todos” muda, por exemplo, todas as frentes de uma vez.
- **Vista 3D** — sombras, reflexos, paredes que se escondem automaticamente quando estão entre a câmara e a cozinha, vistas rápidas e exportação de imagem.
- **Responsivo** — painéis laterais no computador; folhas inferiores e barra de ações no telemóvel/tablet, com gestos de toque (arrastar, pinça para zoom).
- Anular/refazer, gravação automática no navegador e exportação/importação do projeto em JSON.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm test         # testes unitários (geometria e snapping)
npm run build    # build de produção em dist/
```

Tecnologias: React + TypeScript + Vite, three.js via React Three Fiber, Zustand.

## Publicar

O workflow `.github/workflows/deploy.yml` publica a aplicação no GitHub Pages a cada push para `main`. Ative-o em *Settings → Pages → Source: GitHub Actions*.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `R` / `Shift+R` | Rodar 90° |
| `Ctrl+D` | Duplicar |
| `Del` | Apagar |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Anular / refazer |
| Setas | Mover 1 cm (`Shift`: 10 cm) |
| `Shift` ao arrastar | Desligar snap |
| `Espaço` + arrastar | Mover a vista |
| `3` | Alternar 2D / 3D |
