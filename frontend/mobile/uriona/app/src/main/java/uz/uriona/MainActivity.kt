package uz.uriona

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import uz.uriona.data.Product
import uz.uriona.designsystem.UrionaTheme
import uz.uriona.ui.screens.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UrionaTheme {
                var currentScreen by remember { mutableStateOf("splash") }
                var selectedProduct by remember { mutableStateOf<Product?>(null) }
                val cartItems = remember { mutableStateMapOf<Product, Int>() }

                val addToCart: (Product) -> Unit = { product ->
                    val current = cartItems[product] ?: 0
                    cartItems[product] = current + 1
                }

                val removeFromCart: (Product) -> Unit = { product ->
                    val current = cartItems[product] ?: 0
                    if (current > 1) {
                        cartItems[product] = current - 1
                    } else {
                        cartItems.remove(product)
                    }
                }

                when (currentScreen) {
                    "splash" -> SplashScreen(onNavigateToHome = { currentScreen = "main" })
                    "main" -> MainScaffold(
                        onProductClick = { product ->
                            selectedProduct = product
                            currentScreen = "detail"
                        },
                        cartItems = cartItems,
                        onAddToCart = addToCart,
                        onRemoveFromCart = removeFromCart
                    )
                    "detail" -> ProductDetailScreen(
                        product = selectedProduct ?: Product("0", "Mahsulot", "0 UZS", 0, null, null),
                        onBack = { currentScreen = "main" },
                        onAddToCart = { product ->
                            addToCart(product)
                            currentScreen = "main"
                        }
                    )
                }
            }
        }
    }
}
