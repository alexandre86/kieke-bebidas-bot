import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  Send, 
  MessageCircle, 
  Beer, 
  Wine, 
  Coffee,
  MapPin,
  Clock,
  Phone,
  Minus,
  Plus,
  X,
  Settings,
  Webhook,
  Zap
} from "lucide-react";

// Tipos
interface Product {
  id: string;
  name: string;
  type: 'beer' | 'wine' | 'soda' | 'water' | 'energy';
  volume: string;
  price: number;
  isReturnable?: boolean;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  address: string;
  paymentMethod: 'pix' | 'card' | 'cash';
  cardType?: 'debit' | 'credit';
  changeFor?: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'delivered';
}

// Produtos do catálogo
const PRODUCTS: Product[] = [
  { id: '1', name: 'Cerveja Skol Lata', type: 'beer', volume: '350ml', price: 3.50, category: 'Cervejas' },
  { id: '2', name: 'Cerveja Brahma Lata', type: 'beer', volume: '350ml', price: 3.50, category: 'Cervejas' },
  { id: '3', name: 'Cerveja Antarctica Lata', type: 'beer', volume: '350ml', price: 3.50, category: 'Cervejas' },
  { id: '4', name: 'Cerveja Heineken Lata', type: 'beer', volume: '350ml', price: 5.00, category: 'Cervejas Premium' },
  { id: '5', name: 'Cerveja Original Lata', type: 'beer', volume: '350ml', price: 4.50, category: 'Cervejas Premium' },
  { id: '6', name: 'Cerveja Skol Retornável', type: 'beer', volume: '300ml', price: 2.50, isReturnable: true, category: 'Cervejas' },
  { id: '7', name: 'Coca-Cola Lata', type: 'soda', volume: '350ml', price: 4.00, category: 'Refrigerantes' },
  { id: '8', name: 'Pepsi Lata', type: 'soda', volume: '350ml', price: 3.80, category: 'Refrigerantes' },
  { id: '9', name: 'Guaraná Antarctica Lata', type: 'soda', volume: '350ml', price: 3.80, category: 'Refrigerantes' },
  { id: '10', name: 'Água Crystal 500ml', type: 'water', volume: '500ml', price: 2.00, category: 'Águas' },
  { id: '11', name: 'Red Bull Lata', type: 'energy', volume: '250ml', price: 8.00, category: 'Energéticos' },
  { id: '12', name: 'Monster Energy', type: 'energy', volume: '473ml', price: 10.00, category: 'Energéticos' },
];

const DeliveryApp = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'products' | 'cart' | 'settings'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '🍻 E aí! Chegou no lugar certo: Depósito do Kekê na área! Diz aí, no que a gente pode te dar aquela força hoje?',
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    address: '',
    neighborhood: '',
    number: '',
    paymentMethod: '',
    cardType: '',
    changeFor: '',
  });
  const [orderNumber, setOrderNumber] = useState(1);
  const [n8nSettings, setN8nSettings] = useState({
    newOrderWebhook: localStorage.getItem('n8n_new_order_webhook') || '',
    paymentWebhook: localStorage.getItem('n8n_payment_webhook') || '',
    stockWebhook: localStorage.getItem('n8n_stock_webhook') || '',
    enableN8n: localStorage.getItem('n8n_enabled') === 'true' || false,
  });

  const { toast } = useToast();

  // Função para salvar configurações do n8n
  const saveN8nSettings = () => {
    localStorage.setItem('n8n_new_order_webhook', n8nSettings.newOrderWebhook);
    localStorage.setItem('n8n_payment_webhook', n8nSettings.paymentWebhook);
    localStorage.setItem('n8n_stock_webhook', n8nSettings.stockWebhook);
    localStorage.setItem('n8n_enabled', n8nSettings.enableN8n.toString());
    
    toast({
      title: "Configurações salvas!",
      description: "As integrações com n8n foram configuradas com sucesso.",
    });
  };

  // Função para disparar webhook do n8n
  const triggerN8nWebhook = async (webhookUrl: string, data: any) => {
    if (!n8nSettings.enableN8n || !webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: "deposito_do_keke",
        }),
      });
      
      console.log("Webhook n8n disparado:", webhookUrl);
    } catch (error) {
      console.error("Erro ao disparar webhook n8n:", error);
    }
  };
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });

    // Disparar webhook de estoque
    triggerN8nWebhook(n8nSettings.stockWebhook, {
      action: 'product_added_to_cart',
      product: product,
      quantity: quantity,
      cart_total_items: cart.reduce((total, item) => total + item.quantity, 0) + quantity,
    });
  };

  // Função para remover do carrinho
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Função para atualizar quantidade
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Função para finalizar pedido
  const handleFinishOrder = async () => {
    const order = {
      id: `#${orderNumber.toString().padStart(3, '0')}`,
      items: cart,
      total: cartTotal,
      customer: customerInfo,
      address: `${customerInfo.address}, ${customerInfo.number} - ${customerInfo.neighborhood}`,
      paymentMethod: customerInfo.paymentMethod,
      cardType: customerInfo.cardType,
      changeFor: customerInfo.changeFor,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Disparar webhook de novo pedido
    await triggerN8nWebhook(n8nSettings.newOrderWebhook, {
      action: 'new_order',
      order: order,
    });

    // Disparar webhook de pagamento se necessário
    if (customerInfo.paymentMethod === 'pix') {
      await triggerN8nWebhook(n8nSettings.paymentWebhook, {
        action: 'payment_pending',
        order_id: order.id,
        payment_method: 'pix',
        amount: cartTotal,
      });
    }

    toast({
      title: "Pedido realizado com sucesso! 🎉",
      description: `Pedido ${order.id} confirmado. ${customerInfo.paymentMethod === 'pix' ? 'Aguardando comprovante PIX.' : 'Preparando entrega!'}`,
    });

    // Limpar carrinho e informações
    setCart([]);
    setCustomerInfo({
      name: '',
      address: '',
      neighborhood: '',
      number: '',
      paymentMethod: '',
      cardType: '',
      changeFor: '',
    });
    setOrderNumber(prev => prev + 1);
    setCurrentView('chat');

    // Adicionar mensagem no chat
    const successMessage: Message = {
      id: Date.now().toString(),
      content: `✅ Perfeito! Seu pedido ${order.id} foi confirmado!\n\n📦 Total: R$ ${cartTotal.toFixed(2)}\n📍 Endereço: ${order.address}\n💳 Pagamento: ${customerInfo.paymentMethod === 'pix' ? 'PIX' : customerInfo.paymentMethod === 'card' ? `Cartão ${customerInfo.cardType}` : 'Dinheiro'}\n\n${customerInfo.paymentMethod === 'pix' ? '📸 Aguardando comprovante PIX para confirmar!' : '🛵 Já estamos preparando sua entrega!'}`,
      isBot: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, successMessage]);
  };
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Função para enviar mensagem
  const sendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Simular resposta do bot
    setTimeout(() => {
      const botResponse = generateBotResponse(currentMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);

    setCurrentMessage('');
  };

  // Função para gerar resposta do bot
  const generateBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('cerveja') || message.includes('beer')) {
      const beerProducts = PRODUCTS.filter(p => p.type === 'beer');
      const beerList = beerProducts.map(p => 
        `${p.name} (${p.volume}) - R$ ${p.price.toFixed(2)}${p.isReturnable ? ' - ⚠️ Retornável (necessário trazer o casco)' : ''}`
      ).join('\n');
      return `🍺 Temos essas cervejas disponíveis:\n\n${beerList}\n\nQual você gostaria de pedir?`;
    }

    if (message.includes('refrigerante') || message.includes('coca') || message.includes('pepsi')) {
      const sodaProducts = PRODUCTS.filter(p => p.type === 'soda');
      const sodaList = sodaProducts.map(p => 
        `${p.name} (${p.volume}) - R$ ${p.price.toFixed(2)}`
      ).join('\n');
      return `🥤 Temos esses refrigerantes:\n\n${sodaList}\n\nQual você quer?`;
    }

    if (message.includes('energético') || message.includes('red bull') || message.includes('monster')) {
      const energyProducts = PRODUCTS.filter(p => p.type === 'energy');
      const energyList = energyProducts.map(p => 
        `${p.name} (${p.volume}) - R$ ${p.price.toFixed(2)}`
      ).join('\n');
      return `⚡ Temos esses energéticos:\n\n${energyList}\n\nQual você quer?`;
    }

    if (message.includes('água')) {
      const waterProducts = PRODUCTS.filter(p => p.type === 'water');
      const waterList = waterProducts.map(p => 
        `${p.name} (${p.volume}) - R$ ${p.price.toFixed(2)}`
      ).join('\n');
      return `💧 Temos essas águas:\n\n${waterList}`;
    }

    if (message.includes('fechar pedido') || message.includes('finalizar')) {
      if (cart.length === 0) {
        return '🛒 Seu carrinho está vazio! Adicione alguns produtos primeiro. Use o menu "Produtos" para ver nosso catálogo.';
      }
      return 'Para fechar seu pedido, preciso de algumas informações. Vou te ajudar no checkout! 📋';
    }

    return '😊 Entendi! Para ver todos os nossos produtos, use o menu "Produtos". Ou me fale que tipo de bebida você está procurando: cerveja, refrigerante, água, energético...';
  };

  const getProductIcon = (type: Product['type']) => {
    switch (type) {
      case 'beer': return <Beer className="h-5 w-5" />;
      case 'wine': return <Wine className="h-5 w-5" />;
      case 'soda': return <Coffee className="h-5 w-5" />;
      default: return <Beer className="h-5 w-5" />;
    }
  };

  // Agrupar produtos por categoria
  const productsByCategory = PRODUCTS.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 gradient-primary rounded-lg flex items-center justify-center">
                <Beer className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Depósito do Kekê</h1>
                <p className="text-sm text-muted-foreground">Delivery de Bebidas</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={currentView === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('chat')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={currentView === 'products' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('products')}
              >
                <Beer className="h-4 w-4 mr-2" />
                Produtos
              </Button>
              <Button
                variant={currentView === 'cart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('cart')}
                className="relative"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Carrinho
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-accent text-accent-foreground text-xs">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
              <Button
                variant={currentView === 'settings' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                n8n
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Chat View */}
        {currentView === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-strong">
              <div className="flex flex-col h-[600px]">
                <div className="p-6 border-b border-border/50">
                  <h2 className="text-xl font-semibold">Atendimento Virtual</h2>
                  <p className="text-muted-foreground">Converse com nosso atendente</p>
                </div>
                
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                            message.isBot
                              ? 'bg-primary/10 text-foreground border border-primary/20'
                              : 'gradient-primary text-primary-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="p-6 border-t border-border/50">
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Products View */}
        {currentView === 'products' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold">Nossos Produtos</h2>
              <p className="text-muted-foreground mt-2">Escolha suas bebidas favoritas</p>
            </div>
            
            {Object.entries(productsByCategory).map(([category, products]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-2xl font-semibold text-primary">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="shadow-soft hover:shadow-strong transition-all duration-300 hover:scale-105">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 gradient-primary rounded-lg flex items-center justify-center">
                              {getProductIcon(product.type)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{product.name}</h4>
                              <p className="text-sm text-muted-foreground">{product.volume}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {product.isReturnable && (
                          <Badge variant="outline" className="mb-4">
                            ⚠️ Retornável - Trazer casco
                          </Badge>
                        )}
                        
                        <Button
                          onClick={() => addToCart(product)}
                          className="w-full"
                          variant="accent"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Adicionar ao Carrinho
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart View */}
        {currentView === 'cart' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-strong">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Seu Carrinho</h2>
                
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Seu carrinho está vazio</p>
                    <Button
                      onClick={() => setCurrentView('products')}
                      className="mt-4"
                      variant="accent"
                    >
                      Ver Produtos
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 gradient-primary rounded-lg flex items-center justify-center">
                              {getProductIcon(item.type)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">{item.volume}</p>
                              <p className="text-sm font-medium">R$ {item.price.toFixed(2)} cada</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-xl font-bold">Total:</span>
                        <span className="text-2xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold">Informações de Entrega</h3>
                          <Input
                            placeholder="Rua"
                            value={customerInfo.address}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Número"
                              value={customerInfo.number}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, number: e.target.value }))}
                            />
                            <Input
                              placeholder="Bairro"
                              value={customerInfo.neighborhood}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, neighborhood: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="font-semibold">Forma de Pagamento</h3>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant={customerInfo.paymentMethod === 'pix' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'pix' }))}
                            >
                              PIX
                            </Button>
                            <Button
                              variant={customerInfo.paymentMethod === 'card' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'card' }))}
                            >
                              Cartão
                            </Button>
                            <Button
                              variant={customerInfo.paymentMethod === 'cash' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCustomerInfo(prev => ({ ...prev, paymentMethod: 'cash' }))}
                            >
                              Dinheiro
                            </Button>
                          </div>
                          
                          {customerInfo.paymentMethod === 'card' && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant={customerInfo.cardType === 'debit' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCustomerInfo(prev => ({ ...prev, cardType: 'debit' }))}
                              >
                                Débito
                              </Button>
                              <Button
                                variant={customerInfo.cardType === 'credit' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCustomerInfo(prev => ({ ...prev, cardType: 'credit' }))}
                              >
                                Crédito
                              </Button>
                            </div>
                          )}
                          
                          {customerInfo.paymentMethod === 'cash' && (
                            <Input
                              placeholder="Troco para quanto? (opcional)"
                              value={customerInfo.changeFor}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, changeFor: e.target.value }))}
                            />
                          )}
                        </div>
                      </div>
                      
                      <Button
                        className="w-full mt-6"
                        size="lg"
                        variant="accent"
                        disabled={!customerInfo.address || !customerInfo.number || !customerInfo.neighborhood || !customerInfo.paymentMethod}
                        onClick={handleFinishOrder}
                      >
                        Finalizar Pedido - R$ {cartTotal.toFixed(2)}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Settings View - n8n Integration */}
        {currentView === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="shadow-strong">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-12 w-12 gradient-accent rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Integração n8n</h2>
                    <p className="text-muted-foreground">Configure automações para seu delivery</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={n8nSettings.enableN8n}
                      onCheckedChange={(checked) =>
                        setN8nSettings(prev => ({ ...prev, enableN8n: checked }))
                      }
                      id="enable-n8n"
                    />
                    <Label htmlFor="enable-n8n" className="text-base font-medium">
                      Ativar integrações n8n
                    </Label>
                  </div>

                  {n8nSettings.enableN8n && (
                    <div className="space-y-6 border-t border-border pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Webhook className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Webhook - Novos Pedidos</h3>
                          </div>
                          <Input
                            placeholder="https://seu-n8n.com/webhook/novo-pedido"
                            value={n8nSettings.newOrderWebhook}
                            onChange={(e) =>
                              setN8nSettings(prev => ({ ...prev, newOrderWebhook: e.target.value }))
                            }
                          />
                          <p className="text-sm text-muted-foreground">
                            Dispara quando um novo pedido é realizado. Útil para:
                            • Enviar WhatsApp de confirmação
                            • Salvar pedido no Google Sheets
                            • Notificar equipe de entrega
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Webhook className="h-5 w-5 text-secondary" />
                            <h3 className="font-semibold">Webhook - Pagamentos</h3>
                          </div>
                          <Input
                            placeholder="https://seu-n8n.com/webhook/pagamento"
                            value={n8nSettings.paymentWebhook}
                            onChange={(e) =>
                              setN8nSettings(prev => ({ ...prev, paymentWebhook: e.target.value }))
                            }
                          />
                          <p className="text-sm text-muted-foreground">
                            Dispara em eventos de pagamento. Útil para:
                            • Verificar PIX automaticamente
                            • Confirmar pagamentos
                            • Atualizar status do pedido
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Webhook className="h-5 w-5 text-accent" />
                            <h3 className="font-semibold">Webhook - Estoque</h3>
                          </div>
                          <Input
                            placeholder="https://seu-n8n.com/webhook/estoque"
                            value={n8nSettings.stockWebhook}
                            onChange={(e) =>
                              setN8nSettings(prev => ({ ...prev, stockWebhook: e.target.value }))
                            }
                          />
                          <p className="text-sm text-muted-foreground">
                            Dispara quando produtos são adicionados ao carrinho. Útil para:
                            • Controle de estoque em tempo real
                            • Alertas de produtos em falta
                            • Relatórios de produtos mais vendidos
                          </p>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold">Como configurar no n8n:</h3>
                          <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                            <p><strong>1.</strong> Crie um novo workflow no n8n</p>
                            <p><strong>2.</strong> Adicione um nó "Webhook"</p>
                            <p><strong>3.</strong> Configure o método como "POST"</p>
                            <p><strong>4.</strong> Copie a URL do webhook</p>
                            <p><strong>5.</strong> Cole aqui nos campos acima</p>
                            <p><strong>6.</strong> Adicione suas automações (WhatsApp, Sheets, etc.)</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-6 border-t border-border">
                        <Button onClick={saveN8nSettings} variant="accent">
                          Salvar Configurações
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="shadow-soft">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">Exemplos de Automações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-primary/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">📱 WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">
                      Envie confirmações automáticas via WhatsApp Business API
                    </p>
                  </div>
                  <div className="bg-secondary/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-secondary mb-2">📊 Google Sheets</h4>
                    <p className="text-sm text-muted-foreground">
                      Salve todos os pedidos automaticamente em planilhas
                    </p>
                  </div>
                  <div className="bg-accent/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-accent mb-2">💰 PIX</h4>
                    <p className="text-sm text-muted-foreground">
                      Verifique pagamentos PIX automaticamente via API bancária
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-card border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Depósito do Kekê</h3>
              <p className="text-muted-foreground">Delivery de bebidas rápido e confiável</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>(11) 99999-9999</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>18h às 2h todos os dias</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Área de Entrega</h3>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Centro e adjacências</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeliveryApp;