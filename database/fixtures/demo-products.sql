-- Dados descartáveis para desenvolvimento e testes locais.
-- Nunca execute este arquivo no banco de produção.
BEGIN TRANSACTION;

DELETE FROM products
WHERE id IN ('reforma-luxo', 'cracha-inclusivo', 'kit-classico', 'kit-luxo', 'kit-caixinhas', 'adicionais');

INSERT INTO products (
  id, slug, category, badge, meta, name, short_name, price, price_note,
  image_url, image_alt, description, option_label, options, option_prices,
  option_descriptions, customization_fields, customization_notice, details,
  note, published, sort_order
) VALUES
(
  'reforma-luxo', 'reforma-luxo', 'cadernetas', 'Mais escolhido', 'Caderneta de saúde',
  'Reforma luxo', '', 70, 'Pix/dinheiro', '',
  'Reforma luxo de duas cadernetas de saúde personalizadas',
  'Capa nova e completa, mantendo o miolo original da caderneta do bebê.',
  'Acabamento da capa',
  '["Brilhante","Fosco","Holográfico caquinho","Holográfico confete"]',
  '[]',
  '["Cores vibrantes, alto brilho e proteção.","Toque suave, aveludado e elegante.","Fragmentos de brilho que mudam com a luz.","Partículas delicadas e reluzentes."]',
  '[{"id":"coverName","label":"Nome para colocar na capa","type":"text","placeholder":"Ex.: João Gabriel","required":true},{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Ursinho príncipe, referência 1A22","required":true},{"id":"wireColor","label":"Preferência de cor do wire-o","type":"select","options":["Sem preferência","Branco","Rosa","Cobre"],"required":false},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: detalhes de cor ou nome do pingente","required":false}]',
  'A reforma troca a capa e preserva o miolo original da caderneta.',
  '["Capa dura personalizada com arte do catálogo","Wire-o premium conforme disponibilidade","Elástico, passante, tassel ou pingente","Divisórias, bolso interno e folhas adicionais","Laminação brilhante, fosca ou holográfica","Cartão do SUS no mesmo tema como brinde"]',
  'Prazo estimado de 1 a 10 dias úteis, conforme a agenda. No cartão: R$ 75,00.', 1, 10
),
(
  'cracha-inclusivo', 'cracha-inclusivo', 'identificacao', 'Produção em 2 dias', 'Identificação inclusiva',
  'Crachá para autismo e outras necessidades', 'Crachá inclusivo', 35, 'cordão incluso',
  '', 'Frente e verso de crachá de identificação para autismo',
  'Polímero sublimado, mais grosso que PVC, resistente e à prova d’água.', 'Acabamento',
  '["Brilhante","Fosco","Holográfico caquinho","Holográfico confete"]', '[]',
  '["Cores vibrantes, alto brilho e proteção.","Toque suave, aveludado e elegante.","Fragmentos de brilho que mudam com a luz.","Partículas delicadas e reluzentes."]',
  '[{"id":"fullName","label":"Nome completo da pessoa","type":"text","placeholder":"Ex.: Lucas Gabriel da Silva","required":true},{"id":"birthDate","label":"Data de nascimento","type":"date","required":true},{"id":"responsibleName","label":"Nome do responsável","type":"text","placeholder":"Ex.: Maria das Graças Silva","required":true},{"id":"responsiblePhone","label":"Telefone do responsável com DDD","type":"tel","placeholder":"Ex.: (61) 99999-8888","required":true},{"id":"diagnosis","label":"CID, diagnóstico ou laudo","type":"text","placeholder":"Ex.: CID 10: F84.0","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: prefiro detalhes azuis","required":false}]',
  'Após enviar o pedido pelo WhatsApp, mande também uma foto nítida, de preferência com fundo branco.',
  '["Inclui cordão de Autismo","Enviar nome e data de nascimento","Enviar contato de um responsável","Enviar CID ou laudo","Enviar foto nítida com fundo branco","Produção em até 2 dias úteis"]',
  'Pagamento de 50% antecipado para confirmar. Modelo padrão, sem QR Code ou campos extras.', 1, 20
),
(
  'kit-classico', 'kit-classico', 'festas', 'Pedido mínimo', 'Papelaria para festas',
  'Monte seu kit clássico', '', 35, 'kit 10 un. no Pix', '',
  'Modelos e preços do kit clássico para festas',
  'Caixinhas em papel offset fosco, com modelos à sua escolha e impressão em alta qualidade.',
  'Tamanho do kit',
  '["10 unidades — até 2 modelos","15 unidades — até 3 modelos","20 unidades — até 4 modelos"]',
  '[35,51,66]',
  '["Escolha até 2 modelos diferentes.","Escolha até 3 modelos diferentes.","Escolha até 4 modelos diferentes."]',
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]',
  'Personalizados não acompanham guloseimas, apliques 3D ou laços.',
  '["Modelos variados de caixinhas","Pedido mínimo de 5 unidades por modelo","Papel offset fosco 180 g","Impressão em alta qualidade","Kit 15: R$ 51 no Pix","Kit 20: R$ 66 no Pix"]',
  'Valores no cartão e outras combinações estão no catálogo completo de festas.', 1, 30
),
(
  'kit-luxo', 'kit-luxo', 'festas', 'Com laço e 3D', 'Papelaria para festas',
  'Monte seu kit luxo', '', 50, 'kit 10 un. no Pix', '',
  'Modelos e preços do kit luxo para festas',
  'Caixinhas com aplique 3D e laço, personalizadas no tema da sua comemoração.',
  'Tamanho do kit',
  '["10 unidades — até 2 modelos","15 unidades — até 3 modelos","20 unidades — até 4 modelos"]',
  '[50,74,98]',
  '["Até 2 modelos com aplique e laço.","Até 3 modelos com aplique e laço.","Até 4 modelos com aplique e laço."]',
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]',
  'Personalizados não acompanham guloseimas. Confirme o tema antes da produção.',
  '["Caixinhas variadas e maletinhas","Pedido mínimo de 5 unidades por modelo","Papel offset fosco 180 g","Inclui aplique 3D e laço","Kit 15: R$ 74 no Pix","Kit 20: R$ 98 no Pix"]',
  'Personalizados não acompanham guloseimas. Consulte os valores no cartão.', 1, 40
),
(
  'kit-caixinhas', 'kit-caixinhas', 'festas', 'Kit completo', 'Papelaria para festas',
  'Kit caixinhas clássicas', '', 65, 'kit 1 no Pix', '',
  'Kits de caixinhas clássicas para festas',
  'Combinações prontas de caixinhas com topos de docinhos como brinde.', 'Opção',
  '["Kit 1 — 20 itens + 10 brindes","Kit 2 — 40 itens + 15 brindes","Kit 3 — 60 itens + 24 brindes"]',
  '[65,130,190]',
  '["20 caixinhas e 10 topos.","40 caixinhas e 15 topos.","60 caixinhas e 24 topos."]',
  '[{"id":"themeReference","label":"Tema ou referência do catálogo","type":"text","placeholder":"Ex.: Safari, página 12","required":true},{"id":"nameAndAge","label":"Nome e idade para personalização","type":"text","placeholder":"Ex.: Helena, 5 anos","required":true},{"id":"eventDate","label":"Data do evento","type":"date","required":true},{"id":"notes","label":"Observações ou preferências adicionais","type":"textarea","placeholder":"Ex.: cores preferidas ou mensagem","required":false}]',
  'A composição dos kits é fixa e os personalizados não acompanham guloseimas.',
  '["Kit 1: 20 caixinhas e 10 topos","Kit 2: 40 caixinhas e 15 topos","Kit 3: 60 caixinhas e 24 topos","Impressão em alta qualidade","Sem aplique 3D ou laços","A composição não pode ser alterada"]',
  'Personalizados não acompanham guloseimas. Consulte os valores no cartão.', 1, 50
),
(
  'adicionais', 'adicionais', 'acabamentos', 'A partir de R$ 5', 'Encadernação',
  'Adicionais para personalizar', '', 5, 'a partir de', '',
  'Lista de adicionais disponíveis para encadernações',
  'Pequenos detalhes para deixar agendas, cadernetas e planners ainda mais especiais.',
  'Adicional',
  '["Tassel ou pingente","Bolso canguru","Divisórias","Wire-o","Laminação holográfica","Cartão do SUS","Chaveiro","Passante"]',
  '[5,5,8,5,10,10,5,5]',
  '["Pingente para combinar com o tema.","Bolso transparente para documentos.","Divisórias personalizadas.","Branco, rosa ou cobre.","Efeito holográfico na capa.","Cartão no mesmo tema.","Chaveiro polasseal.","Passante metálico decorativo."]',
  '[{"id":"targetProduct","label":"Em qual produto será aplicado?","type":"text","placeholder":"Ex.: reforma de caderneta","required":true},{"id":"themeReference","label":"Tema ou referência","type":"text","placeholder":"Ex.: mesmo tema da caderneta","required":false},{"id":"notes","label":"Observações ou preferência de cor","type":"textarea","placeholder":"Ex.: wire-o cobre ou tassel rosa","required":false}]',
  'Cores e modelos dependem da disponibilidade no momento do pedido.',
  '["Tassel ou pingente: R$ 5","Bolso canguru: R$ 5","Divisórias: R$ 8","Wire-o: R$ 5","Laminação holográfica: R$ 10","Cartão do SUS: R$ 10","Chaveiro ou passante: R$ 5"]',
  'Consulte a disponibilidade das cores de wire-o.', 1, 60
)
ON CONFLICT(id) DO NOTHING;

COMMIT;
