package uz.uriona.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BrandRed = Color(0xFF286BFF)
val BrandSoftRed = Color(0xFFE8F7FF)
val InkDark = Color(0xFF08132F)
val MutedGray = Color(0xFF526585)
val BackgroundLight = Color(0xFFF4F8FF)
val SurfaceWhite = Color.White
val LineGray = Color(0xFFD9E5F5)
val SuccessGreen = Color(0xFF19A463)

private val LightColorScheme = lightColorScheme(
    primary = BrandRed,
    onPrimary = Color.White,
    primaryContainer = BrandSoftRed,
    background = BackgroundLight,
    surface = SurfaceWhite,
    onBackground = InkDark,
    onSurface = InkDark,
    outline = LineGray
)

@Composable
fun UrionaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
