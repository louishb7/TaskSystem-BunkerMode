import dualitySymbol from "../assets/bunkermode/branding/duality_symbol.png";

export default function BrandSymbol({ muted = false, size = "md" }) {
  return (
    <span className={`brand-symbol ${muted ? "muted" : ""} ${size}`}>
      <img src={dualitySymbol} alt="Símbolo General e Soldado" />
    </span>
  );
}
