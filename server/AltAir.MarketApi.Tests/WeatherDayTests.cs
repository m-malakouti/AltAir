using AltAir.MarketApi;
using System.Text.Json;
namespace AltAir.MarketApi.Tests;
public sealed class WeatherDayTests
{
    private static string Data(double min=18,double max=29) => JsonSerializer.Serialize(new {
        timezone="Asia/Tehran",daily_units=new {temperature_2m_max="°C"},hourly_units=new {temperature_2m="°C"},
        daily=new {temperature_2m_min=new[]{min},temperature_2m_max=new[]{max},weather_code=new[]{0}},
        hourly=new {time=new[]{new DateTimeOffset(2026,10,15,12,0,0,TimeSpan.FromHours(3.5)).ToUnixTimeSeconds()},temperature_2m=new[]{27},weather_code=new[]{0}}
    });
    [Fact] public void ReadsSelectedLocalDay() {
        var result=WeatherDayParser.Parse(Data(),new DateOnly(2026,10,15),DateTimeOffset.UtcNow,false);
        Assert.Equal(29,result.Maximum); Assert.Single(result.Hourly); Assert.Equal("2026-10-15",result.Date);
    }
    [Fact] public void RejectsWrongDayAndInvertedRange() {
        Assert.Throws<InvalidDataException>(()=>WeatherDayParser.Parse(Data(),new DateOnly(2026,10,16),DateTimeOffset.UtcNow,false));
        Assert.Throws<InvalidDataException>(()=>WeatherDayParser.Parse(Data(30,29),new DateOnly(2026,10,15),DateTimeOffset.UtcNow,false));
    }
}
