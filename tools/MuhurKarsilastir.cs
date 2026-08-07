/* PORT DOĞRULAMA — Muhur.cs'i muhur.js'e karşı koşturur.
   Fikstür (landmark'lar + JS'in verdiği cevaplar) tools/muhurfikstur.js ile
   üretiliyor; burada aynı landmark'lardan C# cevapları hesaplanıp birebir
   karşılaştırılıyor.

     node tools/muhurfikstur.js > fikstur.json
     <derle> && dotnet MuhurKarsilastir.dll fikstur.json

   TOLERANS: 1e-9 bağıl. Bit-birebir beklenmiyor — JS Math.hypot ölçekleme
   yapıyor, C# sqrt(x²+y²) yapıyor; son basamakta ayrışabilirler. 1e-9, port
   hatası ile duyarlılık gürültüsünü ayırmaya fazlasıyla yeter: gerçek bir port
   hatası (yanlış indeks, ters işaret, kaçmış ağırlık) bundan milyonlarca kat
   büyük sapma üretir. */
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Golge;

static class MuhurKarsilastir
{
    const double TOL = 1e-9;
    static int hata = 0, kontrol = 0;

    static void Esit(string ne, double bekl, double got)
    {
        kontrol++;
        double olcek = Math.Max(1.0, Math.Abs(bekl));
        if (Math.Abs(bekl - got) / olcek > TOL)
        {
            if (hata < 20)
                Console.WriteLine("  ✗ " + ne + "  JS=" + bekl.ToString("R", CultureInfo.InvariantCulture)
                                + "  C#=" + got.ToString("R", CultureInfo.InvariantCulture));
            hata++;
        }
    }

    static void Esit(string ne, string bekl, string got)
    {
        kontrol++;
        if (bekl != got)
        {
            if (hata < 20) Console.WriteLine("  ✗ " + ne + "  JS=" + (bekl ?? "null") + "  C#=" + (got ?? "null"));
            hata++;
        }
    }

    static double Say(object o) { return Convert.ToDouble(o, CultureInfo.InvariantCulture); }
    static string Met(object o) { return o as string; }
    static List<object> Lst(object o) { return (List<object>)o; }
    static Dictionary<string, object> Nes(object o) { return (Dictionary<string, object>)o; }

    static int Main(string[] argv)
    {
        var yol = argv.Length > 0 ? argv[0] : "fikstur.json";
        var kok = Nes(MiniJson.Coz(File.ReadAllText(yol)));

        /* --- 0) sabitler --- */
        Console.WriteLine("0) SABİTLER");
        var sb = Nes(kok["sabitler"]);
        Esit("KILIT_MS", Say(sb["KILIT_MS"]), Muhur.KILIT_MS);
        Esit("DIZI_MS", Say(sb["DIZI_MS"]), Muhur.DIZI_MS);
        Esit("CEZA_MS", Say(sb["CEZA_MS"]), Muhur.CEZA_MS);
        Esit("RED_MESAFE", Say(sb["RED_MESAFE"]), Muhur.RED_MESAFE);
        Esit("RED_ORAN", Say(sb["RED_ORAN"]), Muhur.RED_ORAN);
        Esit("SIGMA_ESIK", Say(sb["SIGMA_ESIK"]), Muhur.SIGMA_ESIK);
        Esit("SIGMA_ORAN", Say(sb["SIGMA_ORAN"]), Muhur.SIGMA_ORAN);
        Console.WriteLine("   " + kontrol + " sabit karşılaştırıldı");

        /* --- 1) özellik vektörü + sınıflandırma --- */
        int n0 = kontrol, h0 = hata;
        var ornekler = Lst(kok["ornekler"]);
        foreach (var oo in ornekler)
        {
            var o = Nes(oo);
            var lmJ = Lst(o["lm"]);
            var lm = new Nokta[lmJ.Count];
            for (int i = 0; i < lmJ.Count; i++)
            {
                var p = Lst(lmJ[i]);
                lm[i] = new Nokta(Say(p[0]), Say(p[1]), 0);
            }
            var etiket = Met(o["etiket"]);
            var f = Muhur.Feat(lm);
            var featJ = Lst(o["feat"]);
            for (int k = 0; k < 9; k++) Esit(etiket + ".feat[" + k + "]", Say(featJ[k]), f[k]);

            var r = Muhur.Siniflandir(f);
            Esit(etiket + ".id", Met(o["id"]), r.Id);
            Esit(etiket + ".red", Met(o["red"]), r.Red);
            Esit(etiket + ".mod", Met(o["mod"]), r.Mod);
            var dsJ = Lst(o["ds"]);
            for (int k = 0; k < dsJ.Count; k++)
            {
                var d = Nes(dsJ[k]);
                Esit(etiket + ".ds[" + k + "].id", Met(d["id"]), r.Ds[k].Id);
                Esit(etiket + ".ds[" + k + "].d", Say(d["d"]), r.Ds[k].D);
            }
        }
        Console.WriteLine("1) ÖZELLİK + SINIFLANDIRMA — " + ornekler.Count + " örnek, "
                        + (kontrol - n0) + " karşılaştırma, " + (hata - h0) + " sapma");

        /* --- 2) dizi motoru --- */
        n0 = kontrol; h0 = hata;
        const double DT = 1000.0 / 60.0;
        var diziler = Lst(kok["diziler"]);
        foreach (var dd in diziler)
        {
            var d = Nes(dd);
            var ad = Met(d["ad"]);
            Muhur.KomboAyarla((bool)d["kombo"]);
            var D = Muhur.YeniDizi();
            double t = 0;
            var olaylar = new List<Olay>();
            var zaman = new List<double>();
            foreach (var aa in Lst(d["adimlar"]))
            {
                var a = Lst(aa);
                string id = Met(a[0]);
                int kare = (int)Say(a[1]);
                for (int k = 0; k < kare; k++)
                {
                    t += DT;
                    foreach (var e in Muhur.Guncelle(D, id, DT, t)) { olaylar.Add(e); zaman.Add(t); }
                }
            }
            var beklJ = Lst(d["olaylar"]);
            Esit(ad + ".olaySayisi", beklJ.Count, olaylar.Count);
            for (int k = 0; k < Math.Min(beklJ.Count, olaylar.Count); k++)
            {
                var e = Nes(beklJ[k]);
                Esit(ad + ".olay[" + k + "].tip", Met(e["tip"]), olaylar[k].Tip);
                Esit(ad + ".olay[" + k + "].id", Met(e["id"]), olaylar[k].Id);
                Esit(ad + ".olay[" + k + "].beceri", Met(e["beceri"]), olaylar[k].Beceri != null ? olaylar[k].Beceri.Ad : null);
                Esit(ad + ".olay[" + k + "].t", Say(e["t"]), zaman[k]);
            }
            var sonDiziJ = Lst(d["sonDizi"]);
            Esit(ad + ".sonDizi.uzunluk", sonDiziJ.Count, D.Dizi.Count);
            for (int k = 0; k < Math.Min(sonDiziJ.Count, D.Dizi.Count); k++)
                Esit(ad + ".sonDizi[" + k + "]", Met(sonDiziJ[k]), D.Dizi[k]);
            Esit(ad + ".sonBeceri", Met(d["sonBeceri"]), D.Beceri != null ? D.Beceri.Ad : null);
        }
        Muhur.KomboAyarla(true);
        Console.WriteLine("2) DİZİ MOTORU — " + diziler.Count + " senaryo, "
                        + (kontrol - n0) + " karşılaştırma, " + (hata - h0) + " sapma");

        /* --- 3) beceri tablosu --- */
        n0 = kontrol; h0 = hata;
        var beceriler = Lst(kok["beceriler"]);
        foreach (var bb in beceriler)
        {
            var b = Nes(bb);
            var dzJ = Lst(b["dz"]);
            var dz = new List<string>();
            foreach (var x in dzJ) dz.Add(Met(x));
            var r = Muhur.BeceriBul(dz);
            string anahtar = string.Join("+", dz.ToArray());
            Esit(anahtar + ".ad", Met(b["ad"]), r != null ? r.Ad : null);
            Esit(anahtar + ".tur", Met(b["tur"]), r != null ? r.Tur : null);
            Esit(anahtar + ".ms", Say(b["ms"]), r != null ? r.Ms : 0);
            Esit(anahtar + ".kat", Say(b["kat"]), r != null ? r.Kat : 0);
        }
        Console.WriteLine("3) BECERİ TABLOSU — " + beceriler.Count + " dizi, "
                        + (kontrol - n0) + " karşılaştırma, " + (hata - h0) + " sapma");

        /* --- 4) çarpışma --- */
        n0 = kontrol; h0 = hata;
        var carp = Lst(kok["carpismalar"]);
        foreach (var cc in carp)
        {
            var c = Nes(cc);
            var r = Muhur.CarpismaCoz(
                new MermiVeri { El = Met(c["a"]), Guc = Say(c["g1"]) },
                new MermiVeri { El = Met(c["b"]), Guc = Say(c["g2"]) });
            string anahtar = Met(c["a"]) + Say(c["g1"]) + "-vs-" + Met(c["b"]) + Say(c["g2"]);
            Esit(anahtar + ".sonuc", Met(c["sonuc"]), r.Sonuc);
            Esit(anahtar + ".kazanan", Met(c["kazanan"]), r.Kazanan != null ? r.Kazanan.El : null);
            Esit(anahtar + ".kalanGuc", Say(c["kalanGuc"]), r.KalanGuc);
        }
        Console.WriteLine("4) ÇARPIŞMA — " + carp.Count + " çift, "
                        + (kontrol - n0) + " karşılaştırma, " + (hata - h0) + " sapma");

        Console.WriteLine();
        Console.WriteLine(hata == 0
            ? "=== " + kontrol + " KARŞILAŞTIRMA, SAPMA YOK ==="
            : "=== " + hata + " SAPMA / " + kontrol + " KARŞILAŞTIRMA ===");
        return hata == 0 ? 0 : 1;
    }
}
